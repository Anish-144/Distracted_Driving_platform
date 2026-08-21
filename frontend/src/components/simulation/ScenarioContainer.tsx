import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionRestored } from '@/store/sessionSlice';
import { fetchProgressData, generateSessionCognitiveReport } from '@/store/progressSlice';
import { aiRequestStarted, aiMessageReceived, aiCleared, behaviorUpdated } from '@/store/aiSlice';
import { fetchFeedback, b64ToAudioUrl, fetchNextScenario, GeneratedScenario } from '@/api/ai';
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
import {
  CheckCircle, XCircle, Car, Trophy, ThumbsUp, Activity, BookOpen,
  Mic, MessageSquare, Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CoachingAudioCard from '@/components/voice/CoachingAudioCard';
import { motion, AnimatePresence } from 'framer-motion';

// ── Scenario pool — 8 types for 50-60 event variety ──────────────────────────
const SCENARIO_TYPES = [
  { type: 'incoming_call',        urgency: 'high' },
  { type: 'whatsapp_notification', urgency: 'medium' },
  { type: 'gps_rerouting',        urgency: 'medium' },
  { type: 'email_alert',          urgency: 'low' },
  { type: 'social_media',         urgency: 'low' },
  { type: 'passenger_question',   urgency: 'medium' },
  { type: 'radio_distraction',    urgency: 'low' },
  { type: 'roadside_event',       urgency: 'medium' },
];

// Cooldown: the same type can't appear in the last N events
const TYPE_COOLDOWN = 3;
const TOTAL_EVENTS = 5;

interface ScenarioContainerProps {
  sessionId: string;
}

type SimulationState = 'IDLE' | 'LOADING_SCENARIO' | 'EVENT_ACTIVE' | 'DECISION_PENDING' | 'SESSION_COMPLETE';

// ── Passenger Context Badge ───────────────────────────────────────────────────
function PassengerContextBadge({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="passenger-badge"
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-3 right-3 z-20 flex items-center gap-2
                     bg-indigo-950/90 border border-indigo-500/40 backdrop-blur-md
                     rounded-full px-3 py-1.5 shadow-lg"
        >
          {/* Animated mic pulse */}
          <span className="relative flex items-center justify-center">
            <span className="absolute w-4 h-4 bg-indigo-500/30 rounded-full animate-ping" />
            <Mic className="w-3 h-3 text-indigo-400 relative z-10" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-indigo-300 leading-none">
              Passenger Speaking
            </span>
            <span className="text-[9px] text-indigo-400/70 leading-none mt-0.5">
              Simulated in-car conversation
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Road Lane Decoration ─────────────────────────────────────────────────────
function RoadDecoration() {
  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none overflow-hidden">
      {/* Sky gradient */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent" />
      {/* Road bottom */}
      <div className="h-2 bg-slate-800" />
      <div className="h-12 bg-slate-900 flex items-center justify-center">
        <div className="flex gap-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-10 h-1 bg-amber-500/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Session Complete Screen ──────────────────────────────────────────────────
function SessionCompleteScreen({
  finalScore,
  sessionId,
  isGenerating,
}: {
  finalScore: number;
  sessionId: string;
  isGenerating: boolean;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const grade =
    finalScore >= 90
      ? { label: 'Excellent', color: 'text-brand-400', stroke: '#10b981', icon: <Trophy className="w-14 h-14 mx-auto text-brand-400" /> }
      : finalScore >= 70
      ? { label: 'Good', color: 'text-accent-400', stroke: '#3b82f6', icon: <ThumbsUp className="w-14 h-14 mx-auto text-accent-400" /> }
      : finalScore >= 50
      ? { label: 'Fair', color: 'text-orange-400', stroke: '#f59e0b', icon: <Activity className="w-14 h-14 mx-auto text-orange-400" /> }
      : { label: 'Needs Work', color: 'text-red-400', stroke: '#ef4444', icon: <BookOpen className="w-14 h-14 mx-auto text-red-400" /> };

  return (
    <div className="w-full flex items-center justify-center py-6 px-2">
      <div className="max-w-5xl w-full animate-slide-up">
        <div className="card p-6 md:p-8 bg-card border border-subtle shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Score & Actions (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center text-center p-6 bg-secondary rounded-2xl border border-subtle">
              <div className="mb-3">{grade.icon}</div>
              <h2 className="text-2xl font-bold text-primary mb-1">Session Complete!</h2>
              <p className={`text-base font-semibold ${grade.color} mb-4`}>{grade.label}</p>

              {/* Gauge */}
              <div className="w-36 h-36 mx-auto my-2 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={grade.stroke}
                    strokeWidth="8"
                    strokeDasharray={`${(finalScore / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${grade.color}`}>{Math.round(finalScore)}</span>
                  <span className="text-muted text-xs">/ 100</span>
                </div>
              </div>

              <p className="text-muted text-xs max-w-xs mt-3 mb-6">
                You completed all {TOTAL_EVENTS} randomized distraction scenarios.
                {finalScore >= 70 ? ' Great split-second instincts!' : ' Continue practicing to sharpen response control.'}
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={async () => {
                    try {
                      await dispatch(generateSessionCognitiveReport(sessionId)).unwrap();
                      toast.success('Cognitive Report generated successfully!');
                      setTimeout(() => router.push(`/dashboard/report?sessionId=${sessionId}`), 1200);
                    } catch (err: any) {
                      toast.error(err || 'Failed to generate report.');
                    }
                  }}
                  disabled={isGenerating}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md"
                >
                  {isGenerating ? 'Analyzing Behavioral Signals...' : 'Generate Cognitive Behavioral Report'}
                </button>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary w-full py-2.5 text-xs font-semibold"
                  >
                    Play Again
                  </button>
                  <Link
                    href="/dashboard"
                    className="btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: AI Behavioral Coaching Debrief (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                  Personalized AI Debrief
                </span>
                <h3 className="text-lg font-bold text-primary">Behavioral Coaching Insights</h3>
              </div>

              <div className="w-full">
                <CoachingAudioCard
                  mode="post_session"
                  autoFetch={true}
                  autoplay={true}
                  postSessionPayload={{
                    session_id: sessionId,
                    session_score: finalScore,
                    with_audio: true,
                  }}
                />
              </div>

              {/* Quick Metrics & Strategy Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-secondary border border-subtle">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Event Protocol
                  </span>
                  <p className="text-sm font-semibold text-primary">
                    {TOTAL_EVENTS} Scenarios Evaluated
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Phone, WhatsApp, GPS & Passengers
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary border border-subtle">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Next Recommended Step
                  </span>
                  <p className="text-sm font-semibold text-brand-400">
                    Review Tailored Lessons
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Target subconscious response triggers
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScenarioContainer({ sessionId }: ScenarioContainerProps) {
  const dispatch = useAppDispatch();
  const { currentEvent, eventsCount, score, lastDecision, lastScoreDelta } = useAppSelector(
    (state) => state.session
  );
  const { enabled: aiEnabled } = useAppSelector((state) => state.ai);
  const { stats, isGenerating } = useAppSelector((state) => state.progress);

  const [simState, setSimState] = useState<SimulationState>('IDLE');
  const [finalScore, setFinalScore] = useState(score);

  // AI Dynamic Scenario State
  const [activeScenario, setActiveScenario] = useState<GeneratedScenario | null>(null);
  const [escalationLevel, setEscalationLevel] = useState(1);
  const [parsedChoices, setParsedChoices] = useState<ResponseChoice[]>([]);

  // Passenger voice badge
  const [isPassengerSpeaking, setIsPassengerSpeaking] = useState(false);

  const eventStartTimeRef = useRef<number | null>(null);
  const engineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const escalationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiCancelTokenRef = useRef<boolean>(false);
  const recentHistoryRef = useRef<number[]>([]);
  const sessionStatsRef = useRef<{ urgency: string; type: string; perfWeight: number }[]>([]);

  // Cooldown-based type tracking (last N generated types)
  const recentTypesRef = useRef<string[]>([]);

  // Immersion Audio Refs
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const history = recentHistoryRef.current;
  const avgPerformance =
    history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0.5;
  const difficultyFactor =
    history.length > 0 ? Math.max(0.2, Math.min(0.9, Math.pow(avgPerformance, 1.5))) : 0.5;

  // ── Subscribe to passenger speaking changes ────────────────────────────────
  useEffect(() => {
    const unsub = passengerEngine.onSpeakingChange((speaking) => {
      setIsPassengerSpeaking(speaking);
    });
    return unsub;
  }, []);

  // ── Scenario selection with cooldown ──────────────────────────────────────
  const pickNextType = () => {
    const recent = recentTypesRef.current;
    const available = SCENARIO_TYPES.filter((s) => !recent.slice(-TYPE_COOLDOWN).includes(s.type));
    const pool = available.length > 0 ? available : SCENARIO_TYPES;

    let totalWeight = 0;
    const weights = pool.map((s) => {
      const isHigh = s.urgency === 'high';
      const w = isHigh
        ? 0.3 + 0.7 * difficultyFactor
        : Math.max(0.2, 1.0 - 0.6 * difficultyFactor);
      totalWeight += w;
      return w;
    });

    let rv = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      rv -= weights[i];
      if (rv <= 0) { idx = i; break; }
    }

    const selected = pool[idx];
    recentTypesRef.current = [...recent, selected.type].slice(-10);
    return selected;
  };

  // ── Trigger next event ────────────────────────────────────────────────────
  const triggerNextEvent = useCallback(
    async (currentCount: number) => {
      if (currentCount >= TOTAL_EVENTS) return;

      setSimState('LOADING_SCENARIO');
      const selectedType = pickNextType();

      try {
        const generated = await fetchNextScenario(selectedType.type);
        setActiveScenario(generated);
        setEscalationLevel(1);

        try {
          const choices = JSON.parse(generated.response_choices);
          setParsedChoices(choices);
        } catch {
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
      } catch {
        toast.error('Failed to generate scenario. Retrying...');
        setSimState('IDLE');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, sessionId, difficultyFactor]
  );

  // ── Passenger Chatter Engine ──────────────────────────────────────────────
  const pollChatter = useCallback(async () => {
    if (simState === 'SESSION_COMPLETE' || aiCancelTokenRef.current) return;

    try {
      const snippet = passengerEngine.getNextSnippet();
      if (snippet) {
        passengerEngine.setSpeaking(true);
        await audioMixer.playTTS(snippet.text, AudioPriority.PASSENGER);
        passengerEngine.setSpeaking(false);
        chatterTimerRef.current = setTimeout(pollChatter, passengerEngine.getNextSilenceGap());
      } else {
        passengerEngine.setSpeaking(false);
        chatterTimerRef.current = setTimeout(pollChatter, 10000);
      }
    } catch {
      passengerEngine.setSpeaking(false);
      chatterTimerRef.current = setTimeout(pollChatter, 10000);
    }
  }, [simState]);

  // ── Strict unmount cleanup ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      aiCancelTokenRef.current = true;
      passengerEngine.setSpeaking(false);
      if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
      if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      audioMixer.stopAllTTS();
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (aiEnabled && simState === 'EVENT_ACTIVE') {
      if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
      audioMixer.init();
      pollChatter();
    } else if (aiEnabled && simState === 'IDLE' && !chatterTimerRef.current && eventsCount > 0) {
      audioMixer.init();
      chatterTimerRef.current = setTimeout(pollChatter, 2000);
    }
    if (simState === 'SESSION_COMPLETE') {
      if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
      passengerEngine.setSpeaking(false);
      audioMixer.stopAllTTS();
      if (ambientAudioRef.current) ambientAudioRef.current.pause();
    }
  }, [simState, eventsCount, aiEnabled, pollChatter]);

  // ── Ambient Audio ─────────────────────────────────────────────────────────
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
        playPromise
          .then(() => {
            if (ambientAudioRef.current) {
              audioMixer.playAudioElement(ambientAudioRef.current, AudioPriority.AMBIENT);
            }
          })
          .catch(() => {});
      }
    }
  }, [simState, eventsCount]);

  // ── Psychological escalation ──────────────────────────────────────────────
  useEffect(() => {
    if (simState === 'EVENT_ACTIVE' && activeScenario) {
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      escalationTimerRef.current = setInterval(() => {
        setEscalationLevel((prev) => Math.min(prev + 1, 3));
      }, 2500);
      return () => {
        if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      };
    }
  }, [simState, activeScenario]);

  // ── Persist progress ──────────────────────────────────────────────────────
  useEffect(() => {
    if (eventsCount > 0 && simState !== 'SESSION_COMPLETE') {
      localStorage.setItem(
        `simulation_${sessionId}`,
        JSON.stringify({
          eventsCount,
          score,
          history: recentHistoryRef.current,
          recentTypes: recentTypesRef.current,
          timestamp: Date.now(),
        })
      );
    }
  }, [eventsCount, score, simState, sessionId]);

  // ── Engine loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineTimerRef.current) clearTimeout(engineTimerRef.current);

    if (simState === 'IDLE') {
      const baseDelay = 3500 - 2000 * difficultyFactor;
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
              if (
                saved.timestamp &&
                Date.now() - saved.timestamp < 3600000 &&
                saved.eventsCount > 0
              ) {
                dispatch(sessionRestored({ score: saved.score, eventsCount: saved.eventsCount }));
                if (saved.history)
                  recentHistoryRef.current = saved.history.map((v: number, i: number, a: number[]) =>
                    i < a.length - 2 ? v * 0.8 : v
                  );
                if (saved.recentTypes) recentTypesRef.current = saved.recentTypes;
                activeCount = saved.eventsCount;
              } else {
                localStorage.removeItem(backupKey);
              }
            } catch {
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

  // ── Decision handler ──────────────────────────────────────────────────────
  const handleDecision = async (
    userResponse: 'ignored' | 'interacted' | 'no_response',
    risk?: string
  ) => {
    if (simState !== 'EVENT_ACTIVE' || !currentEvent) return;
    setSimState('DECISION_PENDING');
    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
    if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);

    // Stop voice agent speech immediately on question completion
    audioMixer.stopAllTTS();
    passengerEngine.setSpeaking(false);
    dispatch(aiCleared());

    const startTime = eventStartTimeRef.current;
    const responseTime = startTime ? (Date.now() - startTime) / 1000 : 5;

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

      dispatch(
        eventResolved({
          decision_type: result.decision_type,
          score_delta: result.score_delta,
          new_score: result.new_score,
        })
      );

      const isGood = result.score_delta >= 0;
      let perfWeight = 0;
      if (isGood) {
        const maxAllowedTime = 10 - 5 * difficultyFactor;
        perfWeight = Math.max(0, Math.min(1, 1 - responseTime / maxAllowedTime));
      }
      recentHistoryRef.current.push(perfWeight);
      if (recentHistoryRef.current.length > TOTAL_EVENTS) recentHistoryRef.current.shift();
      sessionStatsRef.current.push({
        urgency: 'medium',
        type: currentEvent.event_type,
        perfWeight,
      });

      if (isGood)
        toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

      if (aiEnabled) {
        fetchFeedback({
          session_id: sessionId,
          event_type: currentEvent.event_type,
          decision_type: result.decision_type,
          response_time: Math.round(responseTime * 10) / 10,
          score_delta: result.score_delta,
          session_score: result.new_score,
          urgency: 'medium',
          with_audio: false,
        })
          .then((res) => { dispatch(behaviorUpdated(res.behavior)); })
          .catch(() => {});
      }

      // Check for session end BEFORE flipping back to IDLE
      if (eventsCount + 1 >= TOTAL_EVENTS) {
        audioMixer.stopAllTTS();
        passengerEngine.setSpeaking(false);
        if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
        if (ambientAudioRef.current) ambientAudioRef.current.pause();

        try {
          await completeSession(sessionId);
          setFinalScore(result.new_score);
          setSimState('SESSION_COMPLETE');
          localStorage.removeItem(`simulation_${sessionId}`);
          dispatch(fetchProgressData());
        } catch {
          toast.error('Session completed, but failed to sync final analytics.');
          setFinalScore(result.new_score);
          setSimState('SESSION_COMPLETE');
        }
      } else {
        setSimState('IDLE');
      }
    } catch {
      toast.error('Failed to record response. Try again.');
      setSimState('EVENT_ACTIVE');
    }
  };

  // ── Render: Session Complete ──────────────────────────────────────────────
  if (simState === 'SESSION_COMPLETE') {
    return (
      <SessionCompleteScreen
        finalScore={finalScore}
        sessionId={sessionId}
        isGenerating={isGenerating}
      />
    );
  }

  // ── Render: Active Simulation (full-window split layout) ──────────────────
  const progressPct = (eventsCount / TOTAL_EVENTS) * 100;
  const isEventActive = simState === 'EVENT_ACTIVE' && currentEvent && activeScenario;

  return (
    <div className="w-full flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* ── Top Progress Strip ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <span className="text-xs text-muted font-mono tabular-nums whitespace-nowrap">
          Event {eventsCount} / {TOTAL_EVENTS}
        </span>
        <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <Car className="w-4 h-4 text-brand-500 flex-shrink-0" />
      </div>

      {/* ── Main 2-Column Grid ────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── LEFT: Driving Viewport (3 cols) ──────────────────────────── */}
        <div className="lg:col-span-3 relative rounded-2xl overflow-hidden
                        bg-gradient-to-b from-slate-900 to-slate-950
                        border border-slate-800 shadow-2xl
                        min-h-[420px] flex flex-col">
          <RoadDecoration />

          {/* Passenger badge — overlaid top-right */}
          <PassengerContextBadge visible={isPassengerSpeaking} />

          {/* Event content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
            {simState === 'LOADING_SCENARIO' ? (
              <div className="animate-pulse text-center my-12">
                <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-brand-400 font-mono text-xs uppercase tracking-widest">
                  Generating Live Environment…
                </p>
              </div>
            ) : !currentEvent || !activeScenario ? (
              <div className="text-center my-12">
                <div className="mb-3 text-emerald-500">
                  <Car className="w-14 h-14 mx-auto opacity-60" />
                </div>
                <p className="text-muted text-sm">Driving safely… awaiting next event.</p>
              </div>
            ) : (
              <div className="w-full max-w-lg">
                <DistractionEvent scenario={activeScenario} escalationLevel={escalationLevel} />
              </div>
            )}
          </div>

          {/* Timer — pinned to bottom of left panel */}
          {isEventActive && (
            <div className="relative z-10 px-6 pb-5">
              <Timer
                duration={Math.round(10 - 5 * difficultyFactor)}
                onExpire={() => handleDecision('no_response')}
                key={currentEvent!.id}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT: Decision Panel (2 cols) ───────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Score HUD */}
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">
                Session Score
              </p>
              <p className="text-3xl font-bold text-brand-400 tabular-nums">{Math.round(score)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">
                Completed
              </p>
              <p className="text-3xl font-bold text-primary tabular-nums">
                {eventsCount}
                <span className="text-muted text-base font-normal"> / {TOTAL_EVENTS}</span>
              </p>
            </div>
          </div>

          {/* Passenger Context Info Card — always visible */}
          <div className="card p-3.5 flex items-start gap-3 bg-indigo-950/40 border-indigo-500/20">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30
                            flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-indigo-300 mb-0.5">Passenger Voice Agent</p>
              <p className="text-[10px] text-indigo-400/70 leading-relaxed">
                The voice you hear is a simulated passenger creating realistic in-car conversation
                to test your ability to stay focused while socially engaged.
              </p>
            </div>
          </div>

          {/* Decision Buttons + Voice Input */}
          {isEventActive ? (
            <div className="flex flex-col gap-3 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">
                Choose your response
              </p>
              <DecisionButtons
                choices={parsedChoices}
                onDecision={handleDecision}
                isDisabled={simState !== 'EVENT_ACTIVE'}
              />
              <VoiceInput
                onDecision={handleDecision as any}
                isActive={simState === 'EVENT_ACTIVE'}
                isDisabled={simState !== 'EVENT_ACTIVE'}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Waiting for next event…</p>
              </div>
            </div>
          )}

          {/* AI Dialogue */}
          <div><AIDialogue /></div>
        </div>
      </div>
    </div>
  );
}
