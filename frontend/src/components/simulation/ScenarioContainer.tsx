import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData, generateNewAILessonFromSession, generateSessionCognitiveReport } from '@/store/progressSlice';
import { aiRequestStarted, aiMessageReceived, aiCleared, behaviorUpdated } from '@/store/aiSlice';
import { fetchFeedback, b64ToAudioUrl, fetchNextScenario, GeneratedScenario } from '@/api/ai';

import { useSoundEffects } from '@/hooks/useSoundEffects';
import ReflexCardOverlay from './ReflexCardOverlay';
import { postEvent } from '@/api/events';
import { completeSession } from '@/api/sessions';
import { audioMixer, AudioPriority } from '@/utils/AudioMixer';
import { passengerEngine } from '@/utils/passengerEngine';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons, { ResponseChoice } from './DecisionButtons';
import AIDialogue from './AIDialogue';
import Timer from './Timer';
import VoiceInput from '@/components/VoiceInput';
import { CheckCircle, XCircle, Car, Trophy, ThumbsUp, Activity, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CoachingAudioCard from '@/components/voice/CoachingAudioCard';

const SCENARIO_TYPES = [
  { type: 'incoming_call', urgency: 'high' },
  { type: 'whatsapp_notification', urgency: 'medium' },
  { type: 'gps_rerouting', urgency: 'medium' },
  { type: 'email_alert', urgency: 'low' },
  { type: 'social_media', urgency: 'low' },
];

const TOTAL_EVENTS = 5;

interface ScenarioContainerProps {
  sessionId: string;
}

type SimulationState = 'IDLE' | 'LOADING_SCENARIO' | 'EVENT_ACTIVE' | 'DECISION_PENDING' | 'SESSION_COMPLETE';

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
  const generatedTypesRef = useRef<Set<string>>(new Set());

  // Immersion Audio Refs
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const history = recentHistoryRef.current;
  const avgPerformance = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0.5;
  const difficultyFactor = history.length > 0 ? Math.max(0.2, Math.min(0.9, Math.pow(avgPerformance, 1.5))) : 0.5;

  const triggerNextEvent = useCallback(async (currentCount: number) => {
    if (currentCount >= TOTAL_EVENTS) return;
    
    setSimState('LOADING_SCENARIO');
    // STRICT UNIQUENESS FILTER
    const availableTypes = SCENARIO_TYPES.filter(s => !generatedTypesRef.current.has(s.type));
    
    if (availableTypes.length === 0) {
        console.warn("No more unique scenario types available. Ending session early.");
        setSimState('SESSION_COMPLETE');
        return;
    }

    let totalWeight = 0;
    const weights = availableTypes.map(s => {
      const isHigh = s.urgency === 'high';
      let weight = isHigh ? 0.3 + (0.7 * difficultyFactor) : Math.max(0.2, 1.0 - (0.6 * difficultyFactor));
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
    const selectedType = availableTypes[selectedIndex];
    
    // Mark as generated
    generatedTypesRef.current.add(selectedType.type);

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
    } catch (e) {
      toast.error('Failed to generate scenario. Retrying...');
      setSimState('IDLE'); // Let the loop retry
    }
  }, [dispatch, sessionId, aiEnabled, difficultyFactor]);

  // Passenger Chatter Engine
  const pollChatter = useCallback(async () => {
    if (simState === 'SESSION_COMPLETE' || aiCancelTokenRef.current) return;

    try {
      const snippet = passengerEngine.getNextSnippet();
      if (snippet) {
        await audioMixer.playTTS(snippet.text, AudioPriority.PASSENGER);

        chatterTimerRef.current = setTimeout(pollChatter, passengerEngine.getNextSilenceGap());
      } else {
         chatterTimerRef.current = setTimeout(pollChatter, 10000);
      }
    } catch (e) {
      chatterTimerRef.current = setTimeout(pollChatter, 10000);
    }
  }, [simState, dispatch]);

  // Strict unmount cleanup (Bug 3: Audio Continues After Exit)
  useEffect(() => {
    return () => {
      aiCancelTokenRef.current = true;
      if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
      if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      audioMixer.stopAllTTS();
      if (ambientAudioRef.current) {
         ambientAudioRef.current.pause();
         ambientAudioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    if (aiEnabled && simState === 'EVENT_ACTIVE') {
        if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
        // Init mixer context and trigger chatter immediately when an event starts
        audioMixer.init();
        pollChatter();
    } else if (aiEnabled && simState === 'IDLE' && !chatterTimerRef.current && eventsCount > 0) {
        // Init mixer context on first idle after a user interaction (like starting session)
        audioMixer.init();
        chatterTimerRef.current = setTimeout(pollChatter, 2000);
    }
    if (simState === 'SESSION_COMPLETE') {
        if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
        audioMixer.stopAllTTS();
        if (ambientAudioRef.current) ambientAudioRef.current.pause();
    }
  }, [simState, eventsCount, aiEnabled, pollChatter]);

  // Ambient Audio Setup
  useEffect(() => {
    if (!ambientAudioRef.current && typeof window !== 'undefined') {
      const audio = new Audio('/audio/highway_ambient.mp3'); 
      audio.loop = true;
      ambientAudioRef.current = audio;
    }
    if (simState !== 'SESSION_COMPLETE' && simState !== 'IDLE' && eventsCount === 0) {
         audioMixer.init();
         const playPromise = ambientAudioRef.current?.play();
         if (playPromise !== undefined) {
            playPromise.then(() => {
               if (ambientAudioRef.current) {
                 audioMixer.playAudioElement(ambientAudioRef.current, AudioPriority.AMBIENT);
               }
            }).catch(() => {});
         }
    }
  }, [simState, eventsCount]);

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
        eventsCount, score, history: recentHistoryRef.current, generatedTypes: Array.from(generatedTypesRef.current), timestamp: Date.now()
      }));
    }
  }, [eventsCount, score, simState, sessionId]);

  useEffect(() => {
    if (engineTimerRef.current) clearTimeout(engineTimerRef.current);

    if (simState === 'IDLE') {
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
                if (saved.generatedTypes) generatedTypesRef.current = new Set(saved.generatedTypes);
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
  }, [simState, eventsCount, sessionId, dispatch, triggerNextEvent, difficultyFactor]);

  const handleDecision = async (userResponse: 'ignored' | 'interacted' | 'no_response', risk?: string) => {
    if (simState !== 'EVENT_ACTIVE' || !currentEvent) return;
    setSimState('DECISION_PENDING');
    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
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
        const maxAllowedTime = 10 - (5 * difficultyFactor);
        perfWeight = Math.max(0, Math.min(1, 1 - (responseTime / maxAllowedTime)));
      }
      recentHistoryRef.current.push(perfWeight);
      if (recentHistoryRef.current.length > TOTAL_EVENTS) recentHistoryRef.current.shift();
      sessionStatsRef.current.push({ urgency: 'medium', type: currentEvent.event_type, perfWeight });

      if (isGood) toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

      if (aiEnabled) {
        // Background behavior update, no mid-session coaching pause!
        fetchFeedback({
            session_id: sessionId,
            event_type: currentEvent.event_type,
            decision_type: result.decision_type,
            response_time: Math.round(responseTime * 10) / 10,
            score_delta: result.score_delta,
            session_score: result.new_score,
            urgency: 'medium',
            with_audio: false,
        }).then((res) => {
            dispatch(behaviorUpdated(res.behavior));
        }).catch(() => {});
        
        setSimState('IDLE');
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
    const isGood = finalScore >= 70;
    const grade = finalScore >= 90 ? { label: 'Flawless', color: 'text-brand-400', icon: <Trophy className="w-16 h-16 mx-auto text-brand-400" /> }
      : finalScore >= 70 ? { label: 'Solid Run', color: 'text-accent-400', icon: <ThumbsUp className="w-16 h-16 mx-auto text-accent-400" /> }
      : finalScore >= 50 ? { label: 'Survived', color: 'text-orange-400', icon: <Activity className="w-16 h-16 mx-auto text-orange-400" /> }
      : { label: 'Wrecked', color: 'text-red-400', icon: <BookOpen className="w-16 h-16 mx-auto text-red-400" /> };

    return (
      <ReflexCardOverlay 
        finalScore={finalScore} 
        xpEarned={50} // Hardcoded for MVP logic here, but normally from completeSession response
        onReplay={() => window.location.reload()}
        onHome={() => router.push('/arena')}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted">Phase {currentEvent ? eventsCount : eventsCount} of {TOTAL_EVENTS}</span>
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
              <div className="mb-3 text-emerald-500"><Car className="w-12 h-12 mx-auto" /></div>
              <p className="text-muted text-sm">Driving safely... awaiting events.</p>
            </div>
          ) : (
            <>
              <DistractionEvent scenario={activeScenario} escalationLevel={escalationLevel} />
              <Timer duration={Math.round(10 - (5 * difficultyFactor))} onExpire={() => handleDecision('no_response')} key={currentEvent.id} />
            </>
          )}
        </div>
      </div>

      {currentEvent && activeScenario && simState === 'EVENT_ACTIVE' && (
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1">
            <DecisionButtons choices={parsedChoices} onDecision={handleDecision} isDisabled={simState !== 'EVENT_ACTIVE'} />
          </div>
          <VoiceInput
            onDecision={handleDecision as any}
            isActive={simState === 'EVENT_ACTIVE'}
            isDisabled={simState !== 'EVENT_ACTIVE'}
          />
        </div>
      )}

      <div className="mt-4"><AIDialogue /></div>
    </div>
  );
}
