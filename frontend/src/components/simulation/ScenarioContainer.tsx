import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionEnded, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData } from '@/store/progressSlice';
import { postEvent } from '@/api/events';
import { completeSession } from '@/api/sessions';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons from './DecisionButtons';
import Timer from './Timer';
import { CheckCircle, XCircle, Car, StopCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// The 3 scenarios for Week 1
const SCENARIOS = [
  {
    id: 'scenario-001',
    event_type: 'incoming_call' as const,
    name: 'Incoming Phone Call',
    icon: '📱',
    instruction_text: 'Your phone is ringing! What do you do?',
    urgency: 'high',
  },
  {
    id: 'scenario-002',
    event_type: 'whatsapp_notification' as const,
    name: 'WhatsApp Notification',
    icon: '💬',
    instruction_text: 'You just got a WhatsApp message. How do you respond?',
    urgency: 'medium',
  },
  {
    id: 'scenario-003',
    event_type: 'gps_rerouting' as const,
    name: 'GPS Rerouting Alert',
    icon: '🗺️',
    instruction_text: 'Your GPS is rerouting. Do you look at the screen while driving?',
    urgency: 'medium',
  },
];

const TOTAL_EVENTS = 5; // More challenges

interface ScenarioContainerProps {
  sessionId: string;
}

export default function ScenarioContainer({ sessionId }: ScenarioContainerProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentEvent, eventsCount, score, lastDecision, lastScoreDelta } = useAppSelector(
    (state) => state.session
  );

  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(score);
  const eventStartTimeRef = useRef<number | null>(null);
  const engineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recentHistoryRef = useRef<number[]>([]);
  const sessionStatsRef = useRef<{ urgency: string; type: string; perfWeight: number }[]>([]);
  const previousPercentileRef = useRef<number | null>(null);
  const bestPercentileRef = useRef<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize tracking anchors on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
       let historicRanking = null;
       try {
           const payloadStr = localStorage.getItem('sd_dashboard_last_session');
           if (payloadStr) {
               const p = JSON.parse(payloadStr);
               if (p && typeof p.percentile === 'number') historicRanking = p.percentile.toString();
           }
       } catch (e) {
           console.warn('Simulation unparseable previous history');
       }
       
       if (!historicRanking) historicRanking = localStorage.getItem('last_user_percentile'); // Fallback migration
       if (historicRanking) previousPercentileRef.current = parseInt(historicRanking, 10);

       const historicBest = localStorage.getItem('best_user_percentile');
       if (historicBest) bestPercentileRef.current = parseInt(historicBest, 10);
    }
  }, []);

  // Dynamic Difficulty Factor (0.0 = Easy, 1.0 = Hard) based on rolling performance
  const getDifficultyFactor = useCallback(() => {
    const history = recentHistoryRef.current;
    if (history.length === 0) return 0.5; // Neutral start
    const avgPerformance = history.reduce((a, b) => a + b, 0) / history.length;
    
    const curvedFactor = Math.pow(avgPerformance, 1.5); // Apply slight curve for realism
    
    // Constrain strict physics bounds preventing dead-stops or impossible reflexes
    return Math.max(0.2, Math.min(0.9, curvedFactor)); 
  }, []);

  // Trigger next event safely with dynamic difficulty weighting
  const triggerNextEvent = useCallback((currentCount: number) => {
    if (currentCount >= TOTAL_EVENTS) {
      return;
    }
    
    // Controlled weighted selection logic with anti-repetition distribution factor
    const difficultyFactor = getDifficultyFactor();
    const recentHistoryStats = sessionStatsRef.current;
    const lastType = recentHistoryStats.length > 0 ? recentHistoryStats[recentHistoryStats.length - 1].type : null;

    let totalWeight = 0;
    const weights = SCENARIOS.map(s => {
      const isHigh = s.urgency === 'high';
      
      // Base difficulty scaling
      let weight = isHigh 
          ? 0.3 + (0.7 * difficultyFactor) 
          : Math.max(0.2, 1.0 - (0.6 * difficultyFactor));
          
      // Prevent consecutive duplication (forces variety across types)
      if (s.event_type === lastType) {
          weight *= 0.1; 
      }
      
      totalWeight += weight;
      return weight;
    });

    let randomVal = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
        randomVal -= weights[i];
        if (randomVal <= 0) {
            selectedIndex = i;
            break;
        }
    }
    const scenario = SCENARIOS[selectedIndex];
    
    dispatch(
      eventTriggered({
        id: `${sessionId}-event-${currentCount + 1}`,
        event_type: scenario.event_type,
        triggered_at: new Date().toISOString(),
        instruction_text: scenario.instruction_text,
      })
    );
    // Pin deterministic timestamp totally decoupled from React render loops
    eventStartTimeRef.current = Date.now();
  }, [dispatch, sessionId]);

  // Backup active session state with integrity checks
  useEffect(() => {
    if (eventsCount > 0 && !isFinished) {
      localStorage.setItem(`simulation_${sessionId}`, JSON.stringify({ 
        eventsCount, 
        score,
        history: recentHistoryRef.current,
        timestamp: Date.now()
      }));
    }
  }, [eventsCount, score, isFinished, sessionId]);

  // Engine: Auto-trigger scenarios and handle session restoration
  useEffect(() => {
    // Clear any existing timer to prevent overlaps
    if (engineTimerRef.current) clearTimeout(engineTimerRef.current);

    // Smooth scaled timing replacing hard thresholds
    const difficultyFactor = getDifficultyFactor();
    const baseDelay = 2500 - (1500 * difficultyFactor); // scales perfectly 2500ms -> 1000ms
    const variance = (Math.random() - 0.5) * (baseDelay * 0.2); // ±10% controlled variance avoiding extreme spikes
    const spawnDelay = baseDelay + Math.round(variance);

    engineTimerRef.current = setTimeout(() => {
      if (!currentEvent && !isFinished) {
        let activeCount = eventsCount;
        
        // Recover state defensively on page reload
        if (activeCount === 0) {
          const backupKey = `simulation_${sessionId}`;
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            try {
              const saved = JSON.parse(backup);
              
              // Validate schema and enforce 1-hour expiry
              const isValid = typeof saved.eventsCount === 'number' && typeof saved.score === 'number';
              const isNotExpired = saved.timestamp && (Date.now() - saved.timestamp < 60 * 60 * 1000);
              
              if (isValid && isNotExpired && saved.eventsCount > 0) {
                dispatch(sessionRestored({ score: saved.score, eventsCount: saved.eventsCount }));
                if (saved.history) {
                   // Decay ONLY older history performance to ease re-entry, preserving their sharpest recent memory
                   recentHistoryRef.current = saved.history.map((val: number, i: number, arr: number[]) => 
                      i < arr.length - 2 ? val * 0.8 : val
                   );
                }
                activeCount = saved.eventsCount;
              } else {
                localStorage.removeItem(backupKey); // Scrub corrupted/expired sessions automatically
              }
            } catch (e) {
              localStorage.removeItem(backupKey);
            }
          }
        }
        
        // Trigger next event if within limits
        if (activeCount < TOTAL_EVENTS) {
          triggerNextEvent(activeCount);
        }
      }
    }, spawnDelay);

    return () => {
      if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
    };
  }, [currentEvent, eventsCount, isFinished, sessionId, dispatch, triggerNextEvent]);

  // Handle user decision (respond/ ignore)
  const handleDecision = async (userResponse: 'ignored' | 'interacted' | 'no_response') => {
    if (!currentEvent || isProcessing) return;
    setIsProcessing(true);

    const startTime = eventStartTimeRef.current;
    const responseTime = startTime ? (Date.now() - startTime) / 1000 : 5;

    try {
      const result = await postEvent({
        session_id: sessionId,
        event_type: currentEvent.event_type as any,
        user_response: userResponse,
        response_time: Math.round(responseTime * 10) / 10,
      });

      dispatch(
        eventResolved({
          decision_type: result.decision_type,
          score_delta: result.score_delta,
          new_score: result.new_score,
        })
      );

      const isGood = result.score_delta >= 0;
      
      // Track rolling performance factor with weighted reaction time formula
      let perfWeight = 0;
      if (isGood) {
        const maxAllowedTime = 10 - (5 * getDifficultyFactor());
        perfWeight = 1 - (responseTime / maxAllowedTime);
        perfWeight = Math.max(0, Math.min(1, perfWeight)); // Clamp between 0 and 1
      }
      
      recentHistoryRef.current.push(perfWeight);
      if (recentHistoryRef.current.length > TOTAL_EVENTS) recentHistoryRef.current.shift();

      // Track granular event stats for end-of-session behavioral insights
      const scenarioMeta = SCENARIOS.find((s) => s.event_type === currentEvent.event_type) || { urgency: 'medium' };
      sessionStatsRef.current.push({
         urgency: scenarioMeta.urgency,
         type: currentEvent.event_type,
         perfWeight
      });

      if (isGood) toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

      // Check if all events done.
      // At this point, eventsCount is the number of events triggered SO FAR (including the one just resolved).
      if (eventsCount >= TOTAL_EVENTS) {
        // End session — all scenarios completed
        await completeSession(sessionId);
        setFinalScore(result.new_score);
        setIsFinished(true);
        localStorage.removeItem(`simulation_${sessionId}`);
        
        // Sync Redux proactively so dashboard is instantly updated
        dispatch(fetchProgressData());
      }
      // Note: We don't manually trigger the next event here anymore.
      // The Engine useEffect above watches `currentEvent` becoming null and handles it.
    } catch (err) {
      toast.error('Failed to record response. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle timeout (no response)
  const handleTimeout = () => {
    handleDecision('no_response');
  };

  // Session Finished View
  if (isFinished) {
    const grade = finalScore >= 90 ? { label: 'Excellent', color: 'text-brand-400', emoji: '🏆' }
      : finalScore >= 70 ? { label: 'Good', color: 'text-accent-400', emoji: '👍' }
      : finalScore >= 50 ? { label: 'Fair', color: 'text-orange-400', emoji: '💪' }
      : { label: 'Needs Work', color: 'text-red-400', emoji: '📚' };

    // Lightweight Insight Generation & Benchmarking Calculation
    const stats = sessionStatsRef.current;
    
    // Default values for rendering
    let percentile = 50;
    let deltaDisplay = null;
    let behaviorMsg = null;
    let bestDisplay = null;
    let insights: string[] = [];
    
    if (stats.length > 0) {
       // --- 1. Percentile Math
       const avgSessionWeight = stats.reduce((acc, s) => acc + s.perfWeight, 0) / stats.length;
       const compositeScore = (finalScore * 0.3) + (avgSessionWeight * 100 * 0.7);
       
       const pRaw = Math.round(100 / (1 + Math.exp(-0.15 * (compositeScore - 65))));
       let p = Math.max(1, Math.min(99, pRaw));
       
       if (previousPercentileRef.current) {
           p = Math.round((p * 0.7) + (previousPercentileRef.current * 0.3));
       }
       percentile = Math.max(1, Math.min(99, p));
       
       // --- 2. Growth/Decay Delta
       let rawDelta = 0;
       if (previousPercentileRef.current && previousPercentileRef.current > 0) {
           rawDelta = percentile - previousPercentileRef.current;
           if (Math.abs(rawDelta) >= 2) {
               if (rawDelta > 0) {
                   deltaDisplay = <span className="text-green-600 font-medium ml-1.5 px-1.5 py-0.5 bg-green-50 rounded-md text-[10px]">+{rawDelta}% improvement</span>;
                   behaviorMsg = <p className="text-[10px] text-green-600 mt-1 font-medium">Faster reactions and sharper focus detected.</p>;
               } else {
                   deltaDisplay = <span className="text-red-500 font-medium ml-1.5 px-1.5 py-0.5 bg-red-50 rounded-md text-[10px]">{rawDelta}% decline</span>;
                   behaviorMsg = <p className="text-[10px] text-red-500 mt-1 font-medium">Slight hesitation or riskier choices slowed you down.</p>;
               }
           } else {
               deltaDisplay = <span className="text-gray-400 font-medium ml-1.5 px-1.5 py-0.5 bg-gray-50 rounded-md text-[10px]">steady</span>;
               behaviorMsg = <p className="text-[10px] text-gray-500 mt-1">Consistent performance maintained.</p>;
           }
       } else {
           deltaDisplay = <span className="text-brand-600 font-medium ml-1.5 px-1.5 py-0.5 bg-brand-50 rounded-md text-[10px]">baseline set</span>;
           behaviorMsg = <p className="text-[10px] text-brand-600 mt-1 font-medium">Your initial reflex benchmarks have been successfully analyzed.</p>;
       }

       // --- 3. Best Score Math
       let newBest = percentile;
       if (bestPercentileRef.current && bestPercentileRef.current > percentile) {
           newBest = bestPercentileRef.current;
           bestDisplay = <p className="text-[10px] text-gray-400 mt-0.5">Personal Best: <strong className="text-brand-600">{newBest}%</strong></p>;
       } else if (bestPercentileRef.current && percentile >= bestPercentileRef.current) {
           bestDisplay = <p className="text-[10px] text-yellow-600 mt-0.5 font-semibold">🏆 New Personal Best!</p>;
       }
       
       // --- 4. Fused Insight Generation
       const highUrg = stats.filter(s => s.urgency === 'high');
       if (highUrg.length > 0) {
          const avgHigh = highUrg.reduce((acc, s) => acc + s.perfWeight, 0) / highUrg.length;
          if (avgHigh < 0.5) insights.push(`You are faster than ${percentile}% of users, but your reactions slow down under high-pressure distractions.`);
          else if (avgHigh >= 0.8) insights.push(`At the top ${percentile}% globally, you show excellent focus and speed during sudden disruptions.`);
       }
       
       if (stats.length >= 3) {
          const earlyAvg = stats.slice(0, 2).reduce((a, b) => a + b.perfWeight, 0) / 2;
          const lateAvg = stats.slice(-2).reduce((a, b) => a + b.perfWeight, 0) / 2;
          if (earlyAvg - lateAvg > 0.3) insights.push(`Your overall rank is ${percentile}%, but performance degraded over consecutive events (indicative of cognitive fatigue).`);
       }
       
       const phoneStats = stats.filter(s => s.type.toLowerCase().includes('call'));
       if (phoneStats.length > 0 && phoneStats.reduce((a,b) => a+b.perfWeight, 0)/phoneStats.length < 0.6) {
           insights.push(`Phone calls tend to severely disrupt your situational awareness compared to your baseline.`);
       }
       
       // --- 5. Dashboard Persistence
       if (typeof window !== 'undefined') {
          let deltaStatus = 'steady';
          if (rawDelta >= 2) deltaStatus = 'improvement';
          else if (rawDelta <= -2) deltaStatus = 'decline';
          else if (!previousPercentileRef.current) deltaStatus = 'baseline';

          // Packaged, versioned payload ensures no fragmented memory
          const sessionPayload = {
             v: 1, 
             unix_timestamp: Date.now(),
             percentile,
             delta: { val: rawDelta, status: deltaStatus },
             // Length-safe array truncation protecting UI bounding boxes
             insights: insights.slice(0, 2).map((ins) => ins.length > 140 ? ins.substring(0, 137) + '...' : ins)
          };
          
          localStorage.setItem('sd_dashboard_last_session', JSON.stringify(sessionPayload));
          // Track highest score completely agnostic of the latest bundle
          localStorage.setItem('best_user_percentile', newBest.toString());
          
          // Generate Progress Timeline History (limit to last 10 sessions)
          let historyArray: any[] = [];
          try {
             const storedHist = localStorage.getItem('sd_percentile_history');
             if (storedHist) {
                const parsed = JSON.parse(storedHist);
                if (Array.isArray(parsed)) historyArray = parsed;
             }
             
             // Schema migration fallback for legacy arrays
             if (historyArray.length > 0 && historyArray.some(item => typeof item === 'number')) {
                 historyArray = historyArray.map(item => 
                     typeof item === 'number' ? { percentile: item, timestamp: Date.now() - 3600000 } : item
                 );
             }
          } catch(e) {}
          historyArray.push({ percentile, timestamp: Date.now() });
          if (historyArray.length > 10) historyArray.shift();
          localStorage.setItem('sd_percentile_history', JSON.stringify(historyArray));
       }
    }

    return (
      <div className="max-w-md mx-auto animate-slide-up text-center">
        <div className="card">
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
          <p className={`text-lg font-semibold ${grade.color} mb-2`}>{grade.label}</p>

          <div className="w-32 h-32 mx-auto my-6 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={finalScore >= 70 ? '#10b981' : finalScore >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${(finalScore / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${grade.color}`}>{Math.round(finalScore)}</span>
              <span className="text-gray-400 text-xs">/ 100</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            You completed {TOTAL_EVENTS} distraction scenarios. 
            {finalScore >= 70 ? ' Great safe driving instincts!' : ' Keep practicing to improve!'}
          </p>

          {insights.length > 0 && (
            <div className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
               {/* Global Benchmarking Section */}
               <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                  <div className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm text-lg">
                    🌍
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 flex items-center leading-tight">
                        Global Ranking {deltaDisplay}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      You are faster & safer than <span className="font-semibold text-brand-600">{percentile}%</span> of tested drivers.
                    </p>
                    {behaviorMsg}
                    {bestDisplay}
                  </div>
               </div>

               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Behavioral Insights</h3>
               <ul className="space-y-1.5">
                 {insights.map((insight, idx) => (
                   <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                     <span className="text-brand-500 mt-0.5">•</span> 
                     {insight}
                   </li>
                 ))}
               </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary flex-1"
            >
              View AI Feedback & Progress
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex-1"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Driving Scene
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-400">
          Scenario {currentEvent ? eventsCount : eventsCount} of {TOTAL_EVENTS}
        </span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(eventsCount / TOTAL_EVENTS) * 100}%` }}
          />
        </div>
        <Car className="w-4 h-4 text-brand-600" />
      </div>

      {/* Road Scene */}
      <div className="card relative min-h-[300px] flex flex-col items-center justify-center bg-gradient-to-b from-surface-700 to-surface-800 overflow-hidden mb-4">
        {/* Road visualization */}
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="h-24 bg-gradient-to-t from-gray-900 to-transparent" />
          <div className="h-2 bg-gray-700" />
          <div className="h-8 bg-gray-700 flex items-center justify-center">
            <div className="flex gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-8 h-1 bg-amber-400/60 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center flex flex-col items-center">
          {!currentEvent ? (
            <div className="animate-pulse">
              <div className="text-5xl mb-3">🚗</div>
              <p className="text-gray-400 text-sm">Driving... Stay alert!</p>
            </div>
          ) : (
            <>
              {/* Active distraction event */}
              <DistractionEvent
                scenario={SCENARIOS.find((s) => s.event_type === currentEvent.event_type)!}
                instructionText={currentEvent.instruction_text || ''}
              />
              <Timer 
                duration={Math.round(10 - (5 * getDifficultyFactor()))} 
                onExpire={handleTimeout} 
                key={currentEvent.id} 
              />
            </>
          )}
        </div>
      </div>

      {/* Decision Buttons */}
      {currentEvent && (
        <DecisionButtons
          onIgnore={() => handleDecision('ignored')}
          onInteract={() => handleDecision('interacted')}
          isDisabled={isProcessing}
        />
      )}

      {/* Last decision feedback */}
      {lastDecision && !currentEvent && !isFinished && (
        <div className={`glass rounded-xl p-3.5 flex items-center gap-3 mt-4 animate-fade-in shadow-sm border ${
          lastScoreDelta && lastScoreDelta > 0 ? 'border-brand-200 bg-brand-50/50' : 'border-red-200 bg-red-50/50'
        }`}>
          {lastScoreDelta && lastScoreDelta > 0 ? (
            <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {lastScoreDelta && lastScoreDelta > 0
              ? `Safe choice! Next scenario coming up...`
              : `Risky move! Next scenario coming up...`}
          </span>
        </div>
      )}
    </div>
  );
}
