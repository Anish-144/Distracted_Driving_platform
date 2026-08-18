import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData, generateNewAILessonFromSession, generateSessionCognitiveReport } from '@/store/progressSlice';
import { aiRequestStarted, aiMessageReceived, aiCleared, behaviorUpdated } from '@/store/aiSlice';
import { fetchFeedback, b64ToAudioUrl, fetchNextScenario, GeneratedScenario } from '@/api/ai';
import { postEvent } from '@/api/events';
import { completeSession } from '@/api/sessions';
import { audioMixer, AudioPriority } from '@/utils/AudioMixer';
import { passengerEngine } from '@/utils/passengerEngine';
import { SCENARIO_BANK, getSessionScenarios, ScenarioType } from '@/data/scenario_bank';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons, { ResponseChoice } from './DecisionButtons';
import AIDialogue from './AIDialogue';
import Timer from './Timer';
import VoiceInput from '@/components/VoiceInput';
import { CheckCircle, XCircle, Car, Trophy, ThumbsUp, Activity, BookOpen, Shield, Zap, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CoachingAudioCard from '@/components/voice/CoachingAudioCard';
import VoiceContextBadge from './VoiceContextBadge';

// Total distraction events per session
const TOTAL_EVENTS = 5;

// Load the long-term history of used scenario types to avoid repetition
function getUsedScenarioTypes(): Set<string> {
  try {
    const raw = localStorage.getItem('safedrive_used_scenario_types');
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      // Keep only the last 20 to allow scenarios to cycle back after enough time
      return new Set(arr.slice(-20));
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveUsedScenarioType(type: string) {
  try {
    const raw = localStorage.getItem('safedrive_used_scenario_types');
    const arr: string[] = raw ? JSON.parse(raw) : [];
    arr.push(type);
    // Cap at 100 entries to prevent unbounded growth
    const trimmed = arr.slice(-100);
    localStorage.setItem('safedrive_used_scenario_types', JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

interface ScenarioContainerProps {
  sessionId: string;
}

type SimulationState = 'IDLE' | 'LOADING_SCENARIO' | 'SITUATION_BRIEF' | 'EVENT_ACTIVE' | 'DECISION_PENDING' | 'SESSION_COMPLETE';

interface SituationBriefData {
  scenarioName: string;
  distractionType: string;
  context: string;
  eventNumber: number;
}

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

  // Pre-question situation brief state
  const [situationBrief, setSituationBrief] = useState<SituationBriefData | null>(null);
  const [briefSecondsLeft, setBriefSecondsLeft] = useState<number>(8);
  const situationBriefTimerRef = useRef<NodeJS.Timeout | null>(null);
  const briefCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session scenario pool — drawn from the 120+ bank, smart-rotated
  const sessionScenariosRef = useRef<ScenarioType[]>([]);
  const sessionScenarioIndexRef = useRef<number>(0);

  // Voice context badge state
  const [activeVoiceSnippet, setActiveVoiceSnippet] = useState<{ speakerLabel: string; contextHint: string; role: any } | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);

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

    // Initialize the session scenario pool if not done yet
    if (sessionScenariosRef.current.length === 0) {
      const usedTypes = getUsedScenarioTypes();
      // Add any types already used this session
      generatedTypesRef.current.forEach(t => usedTypes.add(t));
      sessionScenariosRef.current = getSessionScenarios(TOTAL_EVENTS * 3, usedTypes);
      sessionScenarioIndexRef.current = 0;
    }

    // Pick next scenario from the session pool — skip if already used this session
    let selectedType: ScenarioType | undefined;
    while (sessionScenarioIndexRef.current < sessionScenariosRef.current.length) {
      const candidate = sessionScenariosRef.current[sessionScenarioIndexRef.current];
      sessionScenarioIndexRef.current++;
      if (!generatedTypesRef.current.has(candidate.type)) {
        selectedType = candidate;
        break;
      }
    }

    if (!selectedType) {
      // Fallback: pick any unseen type from the full bank
      const remaining = SCENARIO_BANK.filter(s => !generatedTypesRef.current.has(s.type));
      selectedType = remaining.length > 0
        ? remaining[Math.floor(Math.random() * remaining.length)]
        : SCENARIO_BANK[Math.floor(Math.random() * SCENARIO_BANK.length)];
    }

    generatedTypesRef.current.add(selectedType.type);
    saveUsedScenarioType(selectedType.type);

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

      // ── Pre-question situation brief ─────────────────────────────────────
      // Build a human-readable context from the scenario narrative
      const distractionLabel = generated.distraction_type.replace(/_/g, ' ');
      const contextNarrative = generated.environmental_context
        || generated.escalation_stage_1
        || `A ${distractionLabel} is about to occur while you're driving.`;

      setSituationBrief({
        scenarioName: selectedType.name || distractionLabel,
        distractionType: distractionLabel,
        context: contextNarrative,
        eventNumber: currentCount + 1,
      });
      setBriefSecondsLeft(8);
      setSimState('SITUATION_BRIEF');
      aiCancelTokenRef.current = false;

      // Decrement countdown each second
      if (briefCountdownIntervalRef.current) clearInterval(briefCountdownIntervalRef.current);
      briefCountdownIntervalRef.current = setInterval(() => {
        setBriefSecondsLeft((prev) => Math.max(0, prev - 1));
      }, 1000);

      // Auto-advance to EVENT_ACTIVE after 8 seconds (extended to allow reading instructions)
      if (situationBriefTimerRef.current) clearTimeout(situationBriefTimerRef.current);
      situationBriefTimerRef.current = setTimeout(() => {
        if (briefCountdownIntervalRef.current) clearInterval(briefCountdownIntervalRef.current);
        setSituationBrief(null);
        eventStartTimeRef.current = Date.now();
        setSimState('EVENT_ACTIVE');
      }, 8000);

    } catch (e) {
      toast.error('Failed to generate scenario. Retrying...');
      setSimState('IDLE'); // Let the loop retry
    }
  }, [dispatch, sessionId, aiEnabled, difficultyFactor]);

  const startChallengeNow = useCallback(() => {
    if (situationBriefTimerRef.current) clearTimeout(situationBriefTimerRef.current);
    if (briefCountdownIntervalRef.current) clearInterval(briefCountdownIntervalRef.current);
    setSituationBrief(null);
    eventStartTimeRef.current = Date.now();
    setSimState('EVENT_ACTIVE');
  }, []);

  // Passenger Chatter Engine — wired to VoiceContextBadge
  const pollChatter = useCallback(async () => {
    if (simState === 'SESSION_COMPLETE' || aiCancelTokenRef.current) return;

    try {
      const snippet = passengerEngine.getNextSnippet();
      if (snippet) {
        // Show voice context badge before speaking
        setActiveVoiceSnippet({
          speakerLabel: snippet.speakerLabel || 'Passenger',
          contextHint: snippet.contextHint || 'A passenger is speaking — a realistic in-car distraction.',
          role: (snippet.speaker as any) || 'passenger',
        });
        setVoiceActive(true);

        await audioMixer.playTTS(snippet.text, AudioPriority.PASSENGER);

        // Mark audio as ended — badge will fade out via its own 1s timer
        setVoiceActive(false);

        chatterTimerRef.current = setTimeout(pollChatter, passengerEngine.getNextSilenceGap());
      } else {
         chatterTimerRef.current = setTimeout(pollChatter, 10000);
      }
    } catch (e) {
      setVoiceActive(false);
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
      if (situationBriefTimerRef.current) clearTimeout(situationBriefTimerRef.current);
      if (briefCountdownIntervalRef.current) clearInterval(briefCountdownIntervalRef.current);
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

    // ── Stop all audio immediately when question ends ──────────────────────
    if (chatterTimerRef.current) { clearTimeout(chatterTimerRef.current); chatterTimerRef.current = null; }
    audioMixer.stopAllTTS();
    setVoiceActive(false);

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
    const grade = finalScore >= 90 ? { label: 'Excellent', color: '#C8FF00', stroke: '#C8FF00', icon: <Trophy className="w-10 h-10" style={{ color: '#C8FF00' }} /> }
      : finalScore >= 70 ? { label: 'Good', color: '#10b981', stroke: '#10b981', icon: <ThumbsUp className="w-10 h-10 text-emerald-400" /> }
      : finalScore >= 50 ? { label: 'Fair', color: '#f59e0b', stroke: '#f59e0b', icon: <Activity className="w-10 h-10 text-amber-400" /> }
      : { label: 'Needs Work', color: '#ef4444', stroke: '#ef4444', icon: <BookOpen className="w-10 h-10 text-red-400" /> };

    const tips = finalScore >= 70
      ? ['Great situational awareness', 'Consistent safe response times', 'Low emotional impulse score']
      : ['Review GPS distraction handling', 'Practice ignoring social media alerts', 'Work on reaction time under pressure'];

    return (
      <div className="w-full animate-fade-in">
        {/* 2-column results layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Score + grade + coaching */}
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="mb-4">{grade.icon}</div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Session Complete!</h2>
            <p className="text-lg font-bold mb-6" style={{ color: grade.color }}>{grade.label}</p>

            {/* Animated score ring */}
            <div className="w-40 h-40 relative mb-6">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={grade.stroke}
                  strokeWidth="8"
                  strokeDasharray={`${(finalScore / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.2s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: grade.color }}>{Math.round(finalScore)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              You completed {TOTAL_EVENTS} distraction scenarios.{' '}
              {finalScore >= 70 ? 'Great safe driving instincts!' : 'Keep practicing to improve!'}
            </p>

            {/* Voice coaching */}
            <div className="w-full text-left mb-6">
              <CoachingAudioCard
                mode="post_session"
                autoFetch={true}
                autoplay={true}
                postSessionPayload={{ session_id: sessionId, session_score: finalScore, with_audio: true }}
              />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button onClick={async () => {
                try {
                  await dispatch(generateSessionCognitiveReport(sessionId)).unwrap();
                  toast.success('Cognitive Report generated successfully!');
                  setTimeout(() => router.push(`/dashboard/report?sessionId=${sessionId}`), 1200);
                } catch (err: any) { toast.error(err || 'Failed to generate report.'); }
              }} disabled={isGenerating} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {isGenerating ? 'Analyzing Session...' : 'Generate Cognitive Behavioral Report'}
              </button>
              <button onClick={() => window.location.reload()} className="btn-secondary w-full py-2 text-xs">Play Again</button>
            </div>
          </div>

          {/* RIGHT: Breakdown + tips */}
          <div className="flex flex-col gap-4">
            {/* Score breakdown cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: grade.color }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Safety Score</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: grade.color }}>{Math.round(finalScore)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>out of 100</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Scenarios</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{TOTAL_EVENTS}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>completed</p>
              </div>
            </div>

            {/* Performance tips */}
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                {finalScore >= 70 ? '✅ What you did well' : '⚠️ Areas to improve'}
              </h3>
              <div className="flex flex-col gap-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: finalScore >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                      <span className="text-[10px]">{finalScore >= 70 ? '✓' : '!'}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Distraction categories faced */}
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Distraction Types Faced</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(generatedTypesRef.current).map(type => (
                  <span key={type} className="text-[11px] font-medium px-2.5 py-1 rounded-full border" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-card)', background: 'var(--bg-surface)' }}>
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Next recommended action */}
            <div className="card p-5" style={{ borderColor: 'var(--color-primary)', background: 'rgba(200,255,0,0.04)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#C8FF00' }}>Next Step</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {finalScore >= 70
                  ? 'View your AI-personalized lessons to sharpen advanced scenarios.'
                  : 'Complete an AI lesson targeting your weak distraction types.'}
              </p>
              <Link href="/lessons" className="btn-primary mt-3 text-xs inline-flex">Go to Lessons →</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active simulation — 2-panel split layout
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Phase {eventsCount} of {TOTAL_EVENTS}</span>
        <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(eventsCount / TOTAL_EVENTS) * 100}%`, background: '#C8FF00' }}
          />
        </div>
        <Car className="w-4 h-4" style={{ color: '#C8FF00' }} />
      </div>

      {/* 2-panel split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT PANEL (60%) — simulation canvas */}
        <div className="lg:col-span-3">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0d1117 0%, #111827 60%, #0a0e17 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '380px',
            }}
          >
            {/* Road lanes at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center gap-6" style={{ background: 'rgba(0,0,0,0.4)' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="w-10 h-1 rounded" style={{ background: 'rgba(245,158,11,0.15)' }} />
              ))}
            </div>

            {/* Pre-question situation brief overlay */}
            {simState === 'SITUATION_BRIEF' && situationBrief && (
              <div
                className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center"
                style={{ background: 'rgba(10,14,23,0.94)', backdropFilter: 'blur(6px)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.25)' }}>
                    Phase {situationBrief.eventNumber} of {TOTAL_EVENTS}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Clock className="w-3 h-3 text-amber-400" />
                    Starting in {briefSecondsLeft}s
                  </span>
                </div>

                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.25)' }}>
                  <Car className="w-6 h-6" style={{ color: '#C8FF00' }} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Upcoming Driving Scenario</p>
                <h3 className="text-xl font-bold mb-3 capitalize text-white">
                  {situationBrief.scenarioName}
                </h3>

                <div className="p-4 rounded-xl max-w-md mb-4 border text-left" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#C8FF00' }}>Context & Instruction</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(230,230,230,0.9)' }}>
                    {situationBrief.context}
                  </p>
                </div>

                {/* Progress bar and skip button */}
                <div className="w-full max-w-md flex flex-col items-center gap-3">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(briefSecondsLeft / 8) * 100}%`, background: '#C8FF00' }}
                    />
                  </div>
                  <button
                    onClick={startChallengeNow}
                    className="btn-primary py-2 px-6 text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                  >
                    <span>Ready? Start Question Now</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-center p-6" style={{ minHeight: '340px' }}>
              {simState === 'LOADING_SCENARIO' ? (
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(200,255,0,0.2)', borderTopColor: '#C8FF00' }} />
                  <p className="font-mono text-xs uppercase tracking-widest" style={{ color: '#C8FF00' }}>Generating Live Environment...</p>
                </div>
              ) : !currentEvent || !activeScenario ? (
                <div className="text-center">
                  <Car className="w-12 h-12 mx-auto mb-3" style={{ color: '#10b981' }} />
                  <p className="text-sm" style={{ color: 'rgba(160,160,160,0.7)' }}>Driving safely... awaiting events.</p>
                </div>
              ) : (
                <>
                  <DistractionEvent scenario={activeScenario} escalationLevel={escalationLevel} />
                  <div className="mt-4 w-full">
                    <Timer duration={Math.round(10 - (5 * difficultyFactor))} onExpire={() => handleDecision('no_response')} key={currentEvent.id} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (40%) — decisions + HUD */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Cognitive load meter */}
          {currentEvent && activeScenario && (
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cognitive Load</span>
                <span className="text-[10px] font-bold" style={{ color: escalationLevel === 1 ? '#10b981' : escalationLevel === 2 ? '#f59e0b' : '#ef4444' }}>
                  {escalationLevel === 1 ? 'MODERATE' : escalationLevel === 2 ? 'ELEVATED' : 'CRITICAL'}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{
                    width: `${(escalationLevel / 3) * 100}%`,
                    background: escalationLevel === 1 ? '#10b981' : escalationLevel === 2 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          )}

          {/* Voice context badge — in side panel so it doesn't overlay the question */}
          {activeVoiceSnippet && (
            <VoiceContextBadge
              isActive={voiceActive}
              speakerLabel={activeVoiceSnippet.speakerLabel}
              contextHint={activeVoiceSnippet.contextHint}
              role={activeVoiceSnippet.role}
            />
          )}

          {/* Decision buttons */}
          {currentEvent && activeScenario && simState === 'EVENT_ACTIVE' ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>Choose your response:</p>
              <DecisionButtons choices={parsedChoices} onDecision={handleDecision} isDisabled={simState !== 'EVENT_ACTIVE'} />
              <VoiceInput
                onDecision={handleDecision as any}
                isActive={simState === 'EVENT_ACTIVE'}
                isDisabled={simState !== 'EVENT_ACTIVE'}
              />
            </>
          ) : simState === 'SITUATION_BRIEF' ? (
            <div className="card p-4 flex flex-col gap-2.5" style={{ borderColor: 'rgba(200,255,0,0.25)', background: 'rgba(200,255,0,0.04)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8FF00' }}>📍 Read the situation</p>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{briefSecondsLeft}s</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                A realistic distraction is about to begin. Understand the context shown on the left, then decide how to respond when the challenge appears.
              </p>
              <button
                onClick={startChallengeNow}
                className="btn-secondary py-1.5 px-3 text-xs self-start mt-1"
              >
                Skip Briefing →
              </button>
            </div>
          ) : (
            <div className="card p-4 flex items-center justify-center" style={{ minHeight: '120px' }}>
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                {simState === 'LOADING_SCENARIO' ? 'Generating scenario...' : 'Awaiting next event...'}
              </p>
            </div>
          )}

          {/* Driving tip */}
          <div className="card p-4" style={{ borderColor: 'rgba(200,255,0,0.15)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#C8FF00' }}>Safety Tip</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Research shows that glancing away for just 2 seconds at highway speed doubles crash risk. Eyes forward!
            </p>
          </div>

          {/* AI Dialogue */}
          <div><AIDialogue /></div>
        </div>
      </div>
    </div>
  );
}
