import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionEnded, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData, generateNewAILessonFromSession } from '@/store/progressSlice';
import {
  aiRequestStarted,
  aiMessageReceived,
  behaviorUpdated,
  aiCleared,
} from '@/store/aiSlice';
import { postEvent } from '@/api/events';
import { completeSession } from '@/api/sessions';
import { fetchPressure, fetchFeedback, b64ToAudioUrl } from '@/api/ai';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons from './DecisionButtons';
import AIDialogue from './AIDialogue';
import Timer from './Timer';
import VoiceInput from '@/components/VoiceInput';
import { CheckCircle, XCircle, Car } from 'lucide-react';
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

type SimulationState = 'IDLE' | 'EVENT_ACTIVE' | 'DECISION_PENDING' | 'COACHING_ACTIVE' | 'SESSION_COMPLETE';

export default function ScenarioContainer({ sessionId }: ScenarioContainerProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentEvent, eventsCount, score, lastDecision, lastScoreDelta } = useAppSelector(
    (state) => state.session
  );
  const { enabled: aiEnabled } = useAppSelector((state) => state.ai);
  const { user } = useAppSelector((state) => state.auth);
  const { stats, isGenerating } = useAppSelector((state) => state.progress);

  const [simState, setSimState] = useState<SimulationState>('IDLE');
  const [finalScore, setFinalScore] = useState(score);
  const eventStartTimeRef = useRef<number | null>(null);
  const engineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiCancelTokenRef = useRef<boolean>(false);
  const recentHistoryRef = useRef<number[]>([]);
  const sessionStatsRef = useRef<{ urgency: string; type: string; perfWeight: number }[]>([]);


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
    setSimState('EVENT_ACTIVE');
    aiCancelTokenRef.current = false; // reset cancel token for this event

    // ── AI Passenger Pressure (non-blocking, best-effort) ──────────────────
    if (aiEnabled) {
      dispatch(aiRequestStarted());
      fetchPressure({
        session_id: sessionId,
        event_type: scenario.event_type,
        urgency: scenario.urgency as 'low' | 'medium' | 'high',
        with_audio: true,
      })
        .then((res) => {
          if (aiCancelTokenRef.current) return; // Stale promise discarded safely
          const audioUrl = res.audio_b64 ? b64ToAudioUrl(res.audio_b64) : null;
          dispatch(aiMessageReceived({
            agent: res.agent,
            text: res.text,
            audioUrl,
            provider: res.provider,
          }));
        })
        .catch(() => {
          if (aiCancelTokenRef.current) return;
          // Silently ignore — AI coaching is enhancement, not critical path
          dispatch(aiCleared());
        });
    }
  }, [dispatch, sessionId, aiEnabled, getDifficultyFactor]);


  // Backup active session state with integrity checks
  useEffect(() => {
    if (eventsCount > 0 && simState !== 'SESSION_COMPLETE') {
      localStorage.setItem(`simulation_${sessionId}`, JSON.stringify({ 
        eventsCount, 
        score,
        history: recentHistoryRef.current,
        timestamp: Date.now()
      }));
    }
  }, [eventsCount, score, simState, sessionId]);

  // Engine: Auto-trigger scenarios and handle session restoration
  useEffect(() => {
    // Clear any existing timer to prevent overlaps
    if (engineTimerRef.current) clearTimeout(engineTimerRef.current);

    if (simState === 'IDLE') {
      const difficultyFactor = getDifficultyFactor();
      
      // More realistic breathing room: Baseline of 3.5s, scales down to 1.5s under high pressure
      const baseDelay = 3500 - (2000 * difficultyFactor);
      
      // Human imperfection: ±30% variance creates unpredictability, avoiding a robotic metronome feel
      const variance = (Math.random() - 0.5) * (baseDelay * 0.6);
      const spawnDelay = baseDelay + Math.round(variance);

      engineTimerRef.current = setTimeout(() => {
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
        } else {
          setSimState('SESSION_COMPLETE');
        }
      }, spawnDelay);
    }

    return () => {
      if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
    };
  }, [simState, eventsCount, sessionId, dispatch, triggerNextEvent, getDifficultyFactor]);

  // Cognitive Load / Escalation Engine (Phase 3)
  const [secondaryDistraction, setSecondaryDistraction] = useState<string | null>(null);
  useEffect(() => {
    if (simState !== 'EVENT_ACTIVE' || !currentEvent) {
      setSecondaryDistraction(null);
      return;
    }
    
    // If the user hasn't responded after 4 seconds, we add a secondary stressor
    // This simulates real-world cognitive overlap (e.g. phone rings AND passenger speaks)
    const loadTimer = setTimeout(() => {
      const stressors = [
        "A car suddenly brakes ahead!",
        "Passenger: 'Are you going to answer that?!'",
        "Navigation: 'Turn right in 50 meters!'",
        "Phone starts vibrating aggressively."
      ];
      setSecondaryDistraction(stressors[Math.floor(Math.random() * stressors.length)]);
    }, 4000);

    return () => clearTimeout(loadTimer);
  }, [simState, currentEvent]);


  // Handle user decision (respond/ ignore)
  const handleDecision = async (userResponse: 'ignored' | 'interacted' | 'no_response') => {
    if (simState !== 'EVENT_ACTIVE' || !currentEvent) return;
    setSimState('DECISION_PENDING');
    
    // Invalidate any ongoing passenger pressure audio/promises
    aiCancelTokenRef.current = true;
    dispatch(aiCleared());

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
        perfWeight = Math.max(0, Math.min(1, perfWeight));
      }
      
      recentHistoryRef.current.push(perfWeight);
      if (recentHistoryRef.current.length > TOTAL_EVENTS) recentHistoryRef.current.shift();

      const scenarioMeta = SCENARIOS.find((s) => s.event_type === currentEvent.event_type) || { urgency: 'medium' };
      sessionStatsRef.current.push({
         urgency: scenarioMeta.urgency,
         type: currentEvent.event_type,
         perfWeight
      });

      if (isGood) toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

      // ── AI Coaching Feedback (non-blocking, parallel with scoring) ─────────
      if (aiEnabled) {
        setSimState('COACHING_ACTIVE');
        dispatch(aiRequestStarted());
        
        try {
          const res = await fetchFeedback({
            session_id: sessionId,
            event_type: currentEvent.event_type,
            decision_type: result.decision_type,
            response_time: Math.round(responseTime * 10) / 10,
            score_delta: result.score_delta,
            session_score: result.new_score,
            urgency: (scenarioMeta.urgency as 'low' | 'medium' | 'high') || 'medium',
            with_audio: true,
          });
          
          const audioUrl = res.audio_b64 ? b64ToAudioUrl(res.audio_b64) : null;
          dispatch(aiMessageReceived({
            agent: res.agent as any,
            text: res.text,
            audioUrl,
            provider: res.provider,
          }));
          dispatch(behaviorUpdated(res.behavior));
          
          // Wait for a few seconds to let them digest the coaching before moving to IDLE
          // If we had an audio length, we could tie it to that. We use a flat 4s delay for coaching.
          setTimeout(() => {
            setSimState('IDLE');
          }, 4000);
          
        } catch (e) {
          dispatch(aiCleared());
          setSimState('IDLE');
        }
      } else {
        // No AI coaching, return to IDLE immediately
        setSimState('IDLE');
      }

      if (eventsCount >= TOTAL_EVENTS) {
        try {
          await completeSession(sessionId);
          setFinalScore(result.new_score);
          setSimState('SESSION_COMPLETE');
          localStorage.removeItem(`simulation_${sessionId}`);
          dispatch(fetchProgressData());
        } catch (e) {
          toast.error("Session completed, but failed to sync final analytics.");
          setFinalScore(result.new_score);
          setSimState('SESSION_COMPLETE');
        }
      }

    } catch (err) {
      toast.error('Failed to record response. Try again.');
      setSimState('EVENT_ACTIVE'); // Revert to let them try again only if postEvent itself fails
    }
  };

  // Handle timeout (no response)
  const handleTimeout = () => {
    handleDecision('no_response');
  };

  // Session Finished View
  if (simState === 'SESSION_COMPLETE') {
    const grade = finalScore >= 90 ? { label: 'Excellent', color: 'text-brand-400', emoji: '🏆' }
      : finalScore >= 70 ? { label: 'Good', color: 'text-accent-400', emoji: '👍' }
      : finalScore >= 50 ? { label: 'Fair', color: 'text-orange-400', emoji: '💪' }
      : { label: 'Needs Work', color: 'text-red-400', emoji: '📚' };

    // Resolve dynamic weakness details based on driver type
    const driverType = stats?.driver_type || 'unknown';
    
    let weakness = {
      title: "Maintaining Steady Focus",
      category: "General Defensive Driving",
      summary: "Your core safety instincts are functional. To achieve elite status, we recommend targeting peripheral lane keeping and high-frequency alert ignoring."
    };
    
    if (driverType === 'impulsive') {
      weakness = {
        title: "High Distraction Response Reflexes",
        category: "Impulse Control & Delayed Reaction",
        summary: "You respond extremely quickly to phone alerts. The fast impulse increases risk. Focus on building a 3-second mental buffer before making safe ignores."
      };
    } else if (driverType === 'distractible') {
      weakness = {
        title: "Digital Notification Susceptibility",
        category: "Attention Management & Digital Focus",
        summary: "You are highly prone to interacting with chat alerts while in transit. Focus on learning to suppress digital visual alerts completely."
      };
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

          {/* Recommended AI Coaching Box */}
          <div className="bg-surface-700/60 border border-brand-500/20 rounded-xl p-5 mb-6 text-left backdrop-blur-sm shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🧠</span>
              <h3 className="font-bold text-white text-sm">Recommended AI Coaching</h3>
              <span className="ml-auto text-[10px] bg-brand-500/20 text-brand-400 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">
                Personalized Recommendation
              </span>
            </div>
            <div className="mb-2.5">
              <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">Focus Category</p>
              <p className="text-brand-400 text-xs font-semibold">{weakness.category}</p>
            </div>
            <div className="mb-3">
              <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">Primary Weakness Detected</p>
              <p className="text-white text-xs font-medium">{weakness.title}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">Coaching Advice Preview</p>
              <p className="text-gray-300 text-[11px] leading-relaxed">{weakness.summary}</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 mb-6">
            <button
              onClick={async () => {
                try {
                  await dispatch(generateNewAILessonFromSession(sessionId)).unwrap();
                  toast.success('AI Lesson generated successfully!');
                  setTimeout(() => {
                    router.push('/lessons');
                  }, 1200);
                } catch (err: any) {
                  toast.error(err || 'Failed to generate personalized lesson.');
                }
              }}
              disabled={isGenerating}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 font-semibold text-xs shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Session & Generating Coaching...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Generate Personalized Coaching For This Session
                </>
              )}
            </button>

            <div className="flex gap-2">
              <Link href="/lessons" className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border border-surface-600 hover:border-gray-500 text-gray-200">
                📅 View Coaching Plan
              </Link>
              <Link href="/lessons" className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border border-surface-600 hover:border-gray-500 text-gray-200">
                📚 Go To Lessons
              </Link>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary flex-1 py-2 text-xs"
            >
              View AI Feedback & Progress
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex-1 py-2 text-xs"
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
              
              {/* Cognitive Load Overlap Overlay */}
              {secondaryDistraction && (
                <div className="mt-2 animate-bounce-short bg-red-900/40 border border-red-500/50 rounded-lg p-2 text-red-200 text-xs font-bold w-full max-w-xs text-center backdrop-blur-md shadow-lg shadow-red-900/20">
                  ⚠️ {secondaryDistraction}
                </div>
              )}

              <Timer 
                duration={Math.round(10 - (5 * getDifficultyFactor()))} 
                onExpire={handleTimeout} 
                key={currentEvent.id} 
              />
            </>
          )}
        </div>
      </div>

      {/* Decision Buttons + Voice Input */}
      {currentEvent && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <DecisionButtons
              onIgnore={() => handleDecision('ignored')}
              onInteract={() => handleDecision('interacted')}
              isDisabled={simState !== 'EVENT_ACTIVE'}
            />
          </div>
          <VoiceInput
            onDecision={handleDecision}
            isActive={simState === 'EVENT_ACTIVE'}
            isDisabled={simState !== 'EVENT_ACTIVE'}
          />
        </div>
      )}

      {/* AI Coaching Dialogue */}
      <div className="mt-3">
        <AIDialogue />
      </div>

      {/* Last decision feedback */}
      {lastDecision && !currentEvent && (
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
