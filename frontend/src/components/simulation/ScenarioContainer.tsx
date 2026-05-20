import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData, generateNewAILessonFromSession } from '@/store/progressSlice';
import {
  aiRequestStarted,
  aiMessageReceived,
  behaviorUpdated,
  aiCleared,
} from '@/store/aiSlice';
import { postEvent } from '@/api/events';
import { completeSession } from '@/api/sessions';
import { fetchPressure, fetchFeedback, b64ToAudioUrl, fetchNextScenario, GeneratedScenario } from '@/api/ai';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons, { ResponseChoice } from './DecisionButtons';
import AIDialogue from './AIDialogue';
import Timer from './Timer';
import VoiceInput from '@/components/VoiceInput';
import { CheckCircle, XCircle, Car } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SCENARIO_TYPES = [
  { type: 'incoming_call', urgency: 'high' },
  { type: 'whatsapp_notification', urgency: 'medium' },
  { type: 'gps_rerouting', urgency: 'medium' },
];

const TOTAL_EVENTS = 5;

interface ScenarioContainerProps {
  sessionId: string;
}

type SimulationState = 'IDLE' | 'LOADING_SCENARIO' | 'EVENT_ACTIVE' | 'DECISION_PENDING' | 'COACHING_ACTIVE' | 'SESSION_COMPLETE';

export default function ScenarioContainer({ sessionId }: ScenarioContainerProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentEvent, eventsCount, score, lastDecision, lastScoreDelta } = useAppSelector((state) => state.session);
  const { enabled: aiEnabled } = useAppSelector((state) => state.ai);
  const { stats, isGenerating } = useAppSelector((state) => state.progress);

  const [simState, setSimState] = useState<SimulationState>('IDLE');
  const [finalScore, setFinalScore] = useState(score);
  
  // AI Dynamic Scenario State
  const [activeScenario, setActiveScenario] = useState<GeneratedScenario | null>(null);
  const [escalationLevel, setEscalationLevel] = useState(1);
  const [parsedChoices, setParsedChoices] = useState<ResponseChoice[]>([]);

  const eventStartTimeRef = useRef<number | null>(null);
  const engineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const escalationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiCancelTokenRef = useRef<boolean>(false);
  const recentHistoryRef = useRef<number[]>([]);
  const sessionStatsRef = useRef<{ urgency: string; type: string; perfWeight: number }[]>([]);

  const getDifficultyFactor = useCallback(() => {
    const history = recentHistoryRef.current;
    if (history.length === 0) return 0.5;
    const avgPerformance = history.reduce((a, b) => a + b, 0) / history.length;
    const curvedFactor = Math.pow(avgPerformance, 1.5);
    return Math.max(0.2, Math.min(0.9, curvedFactor)); 
  }, []);

  const triggerNextEvent = useCallback(async (currentCount: number) => {
    if (currentCount >= TOTAL_EVENTS) return;
    
    setSimState('LOADING_SCENARIO');
    const difficultyFactor = getDifficultyFactor();
    const recentHistoryStats = sessionStatsRef.current;
    const lastType = recentHistoryStats.length > 0 ? recentHistoryStats[recentHistoryStats.length - 1].type : null;

    let totalWeight = 0;
    const weights = SCENARIO_TYPES.map(s => {
      const isHigh = s.urgency === 'high';
      let weight = isHigh ? 0.3 + (0.7 * difficultyFactor) : Math.max(0.2, 1.0 - (0.6 * difficultyFactor));
      if (s.type === lastType) weight *= 0.1; 
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
    const selectedType = SCENARIO_TYPES[selectedIndex];

    try {
      // Fetch dynamic psychological scenario from AI engine
      const generated = await fetchNextScenario(selectedType.type);
      setActiveScenario(generated);
      setEscalationLevel(1);
      
      try {
        const choices = JSON.parse(generated.response_choices);
        setParsedChoices(choices);
      } catch (e) {
        setParsedChoices([]);
      }

      dispatch(
        eventTriggered({
          id: `${sessionId}-event-${currentCount + 1}`,
          event_type: generated.distraction_type,
          triggered_at: new Date().toISOString(),
          instruction_text: generated.escalation_stage_1,
        })
      );
      
      eventStartTimeRef.current = Date.now();
      setSimState('EVENT_ACTIVE');
      aiCancelTokenRef.current = false;

      // Secondary AI Passenger Pressure
      if (aiEnabled) {
        dispatch(aiRequestStarted());
        fetchPressure({
          session_id: sessionId,
          event_type: generated.distraction_type,
          urgency: selectedType.urgency as any,
          with_audio: true,
        }).then((res) => {
          if (aiCancelTokenRef.current) return;
          dispatch(aiMessageReceived({
            agent: res.agent,
            text: res.text,
            audioUrl: res.audio_b64 ? b64ToAudioUrl(res.audio_b64) : null,
            provider: res.provider,
          }));
        }).catch(() => dispatch(aiCleared()));
      }
    } catch (e) {
      toast.error('Failed to generate scenario. Retrying...');
      setSimState('IDLE'); // Let the loop retry
    }
  }, [dispatch, sessionId, aiEnabled, getDifficultyFactor]);

  // Handle dynamic psychological escalation
  useEffect(() => {
    if (simState === 'EVENT_ACTIVE' && activeScenario) {
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      
      // Escalate every 2.5 seconds to build pressure
      escalationTimerRef.current = setInterval(() => {
        setEscalationLevel((prev) => Math.min(prev + 1, 3));
      }, 2500);
      
      return () => {
        if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      };
    }
  }, [simState, activeScenario]);

  useEffect(() => {
    if (eventsCount > 0 && simState !== 'SESSION_COMPLETE') {
      localStorage.setItem(`simulation_${sessionId}`, JSON.stringify({ 
        eventsCount, score, history: recentHistoryRef.current, timestamp: Date.now()
      }));
    }
  }, [eventsCount, score, simState, sessionId]);

  useEffect(() => {
    if (engineTimerRef.current) clearTimeout(engineTimerRef.current);

    if (simState === 'IDLE') {
      const difficultyFactor = getDifficultyFactor();
      const baseDelay = 3500 - (2000 * difficultyFactor);
      const variance = (Math.random() - 0.5) * (baseDelay * 0.6);
      const spawnDelay = baseDelay + Math.round(variance);

      engineTimerRef.current = setTimeout(() => {
        let activeCount = eventsCount;
        if (activeCount === 0) {
          const backupKey = `simulation_${sessionId}`;
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            try {
              const saved = JSON.parse(backup);
              if (saved.timestamp && (Date.now() - saved.timestamp < 3600000) && saved.eventsCount > 0) {
                dispatch(sessionRestored({ score: saved.score, eventsCount: saved.eventsCount }));
                if (saved.history) recentHistoryRef.current = saved.history.map((v: number, i: number, a: number[]) => i < a.length - 2 ? v * 0.8 : v);
                activeCount = saved.eventsCount;
              } else {
                localStorage.removeItem(backupKey);
              }
            } catch (e) {
              localStorage.removeItem(backupKey);
            }
          }
        }
        
        if (activeCount < TOTAL_EVENTS) triggerNextEvent(activeCount);
        else setSimState('SESSION_COMPLETE');
      }, spawnDelay);
    }
    return () => { if (engineTimerRef.current) clearTimeout(engineTimerRef.current); };
  }, [simState, eventsCount, sessionId, dispatch, triggerNextEvent, getDifficultyFactor]);

  const handleDecision = async (userResponse: 'ignored' | 'interacted' | 'no_response', risk?: string) => {
    if (simState !== 'EVENT_ACTIVE' || !currentEvent) return;
    setSimState('DECISION_PENDING');
    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
    aiCancelTokenRef.current = true;
    dispatch(aiCleared());

    const startTime = eventStartTimeRef.current;
    const responseTime = startTime ? (Date.now() - startTime) / 1000 : 5;

    // Use risk to influence score if provided dynamically
    let forcedResponse = userResponse;
    if (risk === 'high') forcedResponse = 'interacted';
    else if (risk === 'safe') forcedResponse = 'ignored';

    try {
      const result = await postEvent({
        session_id: sessionId,
        event_type: currentEvent.event_type as any,
        user_response: forcedResponse,
        response_time: Math.round(responseTime * 10) / 10,
      });

      dispatch(eventResolved({
        decision_type: result.decision_type,
        score_delta: result.score_delta,
        new_score: result.new_score,
      }));

      const isGood = result.score_delta >= 0;
      let perfWeight = 0;
      if (isGood) {
        const maxAllowedTime = 10 - (5 * getDifficultyFactor());
        perfWeight = Math.max(0, Math.min(1, 1 - (responseTime / maxAllowedTime)));
      }
      recentHistoryRef.current.push(perfWeight);
      if (recentHistoryRef.current.length > TOTAL_EVENTS) recentHistoryRef.current.shift();
      sessionStatsRef.current.push({ urgency: 'medium', type: currentEvent.event_type, perfWeight });

      if (isGood) toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

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
            urgency: 'medium',
            with_audio: true,
          });
          dispatch(aiMessageReceived({
            agent: res.agent as any, text: res.text,
            audioUrl: res.audio_b64 ? b64ToAudioUrl(res.audio_b64) : null,
            provider: res.provider,
          }));
          dispatch(behaviorUpdated(res.behavior));
          setTimeout(() => setSimState('IDLE'), 4000);
        } catch (e) {
          dispatch(aiCleared());
          setSimState('IDLE');
        }
      } else {
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
      setSimState('EVENT_ACTIVE');
    }
  };

  if (simState === 'SESSION_COMPLETE') {
    const grade = finalScore >= 90 ? { label: 'Excellent', color: 'text-brand-400', emoji: '🏆' }
      : finalScore >= 70 ? { label: 'Good', color: 'text-accent-400', emoji: '👍' }
      : finalScore >= 50 ? { label: 'Fair', color: 'text-orange-400', emoji: '💪' }
      : { label: 'Needs Work', color: 'text-red-400', emoji: '📚' };

    const driverType = stats?.driver_type || 'unknown';
    let weakness = { title: "Maintaining Steady Focus", category: "General Defensive Driving", summary: "Your core safety instincts are functional." };
    if (driverType === 'impulsive') weakness = { title: "High Distraction Reflexes", category: "Impulse Control", summary: "You respond extremely quickly to phone alerts." };
    else if (driverType === 'distractible') weakness = { title: "Digital Susceptibility", category: "Attention Management", summary: "You are highly prone to interacting with chat alerts." };

    return (
      <div className="max-w-md mx-auto animate-slide-up text-center">
        <div className="card">
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
          <p className={`text-lg font-semibold ${grade.color} mb-2`}>{grade.label}</p>
          <div className="w-32 h-32 mx-auto my-6 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={finalScore >= 70 ? '#10b981' : finalScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeDasharray={`${(finalScore / 100) * 251.2} 251.2`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${grade.color}`}>{Math.round(finalScore)}</span>
              <span className="text-gray-400 text-xs">/ 100</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-6">You completed {TOTAL_EVENTS} distraction scenarios. {finalScore >= 70 ? ' Great safe driving instincts!' : ' Keep practicing to improve!'}</p>
          
          <div className="flex flex-col gap-2.5 mb-6">
            <button onClick={async () => {
              try {
                await dispatch(generateNewAILessonFromSession(sessionId)).unwrap();
                toast.success('Cognitive Report generated successfully!');
                setTimeout(() => router.push('/dashboard/report'), 1200);
              } catch (err: any) { toast.error(err || 'Failed to generate report.'); }
            }} disabled={isGenerating} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {isGenerating ? 'Analyzing Session...' : 'Generate Cognitive Behavioral Report'}
            </button>
            <button onClick={() => window.location.reload()} className="btn-secondary w-full py-2 text-xs">Play Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-400">Phase {currentEvent ? eventsCount : eventsCount} of {TOTAL_EVENTS}</span>
        <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(eventsCount / TOTAL_EVENTS) * 100}%` }} />
        </div>
        <Car className="w-4 h-4 text-brand-500" />
      </div>

      <div className="card relative min-h-[300px] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden mb-4 border border-slate-800">
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="h-32 bg-gradient-to-t from-slate-950 to-transparent" />
          <div className="h-2 bg-slate-800" />
          <div className="h-10 bg-slate-900 flex items-center justify-center">
            <div className="flex gap-6">
              {Array.from({ length: 12 }).map((_, i) => (<div key={i} className="w-10 h-1 bg-amber-500/20 rounded" />))}
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full flex flex-col items-center p-4">
          {simState === 'LOADING_SCENARIO' ? (
            <div className="animate-pulse text-center my-12">
              <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-brand-400 font-mono text-xs uppercase tracking-widest">Generating Live Environment...</p>
            </div>
          ) : !currentEvent || !activeScenario ? (
            <div className="animate-pulse text-center my-12">
              <div className="text-5xl mb-3">🚗</div>
              <p className="text-gray-400 text-sm">Driving safely... awaiting events.</p>
            </div>
          ) : (
            <>
              <DistractionEvent scenario={activeScenario} escalationLevel={escalationLevel} />
              <Timer duration={Math.round(10 - (5 * getDifficultyFactor()))} onExpire={() => handleDecision('no_response')} key={currentEvent.id} />
            </>
          )}
        </div>
      </div>

      {currentEvent && activeScenario && simState === 'EVENT_ACTIVE' && (
        <DecisionButtons choices={parsedChoices} onDecision={handleDecision} isDisabled={simState !== 'EVENT_ACTIVE'} />
      )}

      <div className="mt-4"><AIDialogue /></div>
    </div>
  );
}
