import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateProfile } from '@/api/user';
import { loginSuccess } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import {
  Brain, ChevronRight, Loader2, CheckCircle2, Zap, Target,
  MessageCircle, BellRing, Smartphone, Navigation, Clock, Flame,
  Music, AlertOctagon
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

// ── Types ─────────────────────────────────────────────────────────────────────

type OnboardingPhase = 'WELCOME' | 'QUESTIONNAIRE' | 'MODE_SELECTION' | 'CALIBRATION' | 'PROCESSING' | 'RESULT';

interface CalibrationScenario {
  id: string; title: string; duration_ms: number;
  ui_type: string; instruction: string;
}

interface CalibrationEventPayload {
  scenario_id: string;
  first_response_ms: number;
  time_to_choice_ms: number;
  interaction_count: number;
  distraction_clicks: number;
  re_read_count: number;
  choice_made: string;
  abandoned: boolean;
}

// ── Welcome Phase ─────────────────────────────────────────────────────────────

function WelcomePhase({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-10 py-10"
    >
      <div className="relative mx-auto w-32 h-32">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-30 bg-blue-600 dark:bg-indigo-600 animate-pulse" />
        <div className="relative w-32 h-32 rounded-full flex items-center justify-center bg-secondary border-2 border-blue-500 dark:border-indigo-500 shadow-2xl">
          <Brain className="w-16 h-16 text-blue-500 dark:text-indigo-400" />
        </div>
      </div>

      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-black text-primary tracking-tight mb-2"
        >
          Driver AI Setup
        </motion.h1>
        <p className="text-secondary text-lg font-medium">Let&apos;s personalize your coaching.</p>
      </div>

        <motion.button
        onClick={onBegin}
        className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-lg shadow-blue-500/20"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        Start Setup
      </motion.button>
    </motion.div>
  );
}

// ── Questionnaire Phase ───────────────────────────────────────────────────────

function QuestionnairePhase({ onComplete }: { onComplete: (answers: any[], dynamicResponse: string) => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDynamicPhase, setIsDynamicPhase] = useState(false);
  const [dynamicQuestion, setDynamicQuestion] = useState('');
  const [dynamicAnswer, setDynamicAnswer] = useState('');
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  useEffect(() => {
    client.get('/onboarding/questions').then(res => setQuestions(res.data)).catch(() => toast.error('Failed to load questions.'));
  }, []);

  if (questions.length === 0) {
    return <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-500" /></div>;
  }

  const handleBaseAnswer = async (value: string) => {
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      // Finished base questions, fetch dynamic question
      setIsDynamicPhase(true);
      setIsLoadingDynamic(true);
      try {
        const payload = Object.entries(newAnswers).map(([k, v]) => ({ question_id: k, answer_value: v }));
        const res = await client.post('/onboarding/dynamic-question', { answers: payload });
        setDynamicQuestion(res.data.question_text);
      } catch (err) {
        toast.error('Failed to load AI question.');
        // Skip dynamic if it fails
        onComplete(Object.entries(newAnswers).map(([k, v]) => ({ question_id: k, answer_value: v })), "");
      } finally {
        setIsLoadingDynamic(false);
      }
    }
  };

  const handleDynamicSubmit = () => {
    const payload = Object.entries(answers).map(([k, v]) => ({ question_id: k, answer_value: v }));
    // Append the dynamic answer text directly to the payload so it can be submitted
    payload.push({ question_id: 'dynamic_q', answer_value: dynamicAnswer });
    onComplete(payload, dynamicAnswer);
  };

  if (isDynamicPhase) {
    return (
      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="py-8">
        <div className="flex items-center gap-3 mb-6 justify-center text-violet-500">
          <Brain className="w-6 h-6" />
          <span className="font-bold text-sm uppercase tracking-wider">AI Coach Analysis</span>
        </div>
        {isLoadingDynamic ? (
          <div className="text-center py-10 space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-violet-500" />
            <p className="text-secondary font-medium animate-pulse">Analyzing your profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 font-bold text-xs uppercase tracking-widest mb-3">
                Reflection Challenge
              </span>
              <h2 className="text-2xl font-black text-primary leading-tight mb-2">
                {dynamicQuestion}
              </h2>
              <p className="text-sm text-secondary font-medium mt-2">
                Write a brief response to the AI Coach question above to customize your driving profile.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-wider text-left pl-1">
                Your Answer (1-2 sentences)
              </label>
              <textarea
                value={dynamicAnswer}
                onChange={e => setDynamicAnswer(e.target.value)}
                placeholder="Describe how you handle this scenario (e.g., how you manage the distraction or pressure)..."
                className="w-full bg-secondary border border-subtle rounded-3xl p-6 text-primary resize-none outline-none focus:border-blue-500 dark:focus:border-indigo-500 transition-colors"
                rows={4}
              />
            </div>
            <button
              onClick={handleDynamicSubmit}
              disabled={!dynamicAnswer.trim()}
              className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-lg shadow-blue-500/20 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              Continue
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  const q = questions[currentIdx];

  return (
    <motion.div key={q.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="py-8">
      <div className="flex justify-center gap-2 mb-8">
        {questions.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 ${i <= currentIdx ? 'bg-blue-500 dark:bg-indigo-500' : 'bg-secondary'}`} />
        ))}
      </div>
      <h2 className="text-2xl font-black text-primary text-center leading-tight mb-10">{q.text}</h2>
      <div className="space-y-3">
        {q.options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => handleBaseAnswer(opt.value)}
            className="w-full p-5 rounded-3xl bg-secondary border border-subtle font-bold text-primary active:scale-95 transition-all hover:border-blue-500 dark:hover:border-indigo-500 hover:bg-blue-500/5 dark:hover:bg-indigo-500/5 text-left"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Mode Selection Phase ──────────────────────────────────────────────────────

function ModeSelectionPhase({ onSelect }: { onSelect: (mode: string) => void }) {
  const modes = [
    { id: 'focus', title: 'Focus Mode', desc: 'Test your raw attention under distraction', color: 'bg-emerald-500', icon: Target },
    { id: 'impulse', title: 'Impulse Mode', desc: 'Can you hold back when provoked?', color: 'bg-violet-500', icon: Zap },
    { id: 'social', title: 'Social Pressure Mode', desc: 'Yield to friends or follow the rules?', color: 'bg-amber-500', icon: MessageCircle },
    { id: 'stress', title: 'Stress Mode', desc: 'Navigate high-speed conflicting info', color: 'bg-red-500', icon: Flame },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
      <h2 className="text-3xl font-black text-primary text-center mb-2">Select Mode</h2>
      <p className="text-secondary text-center mb-8 font-medium">Choose your challenge type.</p>
      
      <div className="space-y-4">
        {modes.map(mode => (
          <motion.button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 rounded-3xl bg-secondary border border-subtle flex items-center gap-4 text-left shadow-lg shadow-black/5"
          >
            <div className={`w-14 h-14 rounded-2xl ${mode.color} flex items-center justify-center text-white shrink-0 shadow-inner`}>
              <mode.icon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-primary">{mode.title}</h3>
              <p className="text-xs text-muted">{mode.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ── S1: Notification Storm ────────────────────────────────────────────────────

function NotificationStormScenario({ id, durationMs, onComplete }: any) {
  const startTime = useRef(Date.now());
  const [messages, setMessages] = useState<number[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const i1 = setTimeout(() => setMessages([1]), 500);
    const i2 = setTimeout(() => setMessages([1, 2]), 1200);
    const i3 = setTimeout(() => setMessages([1, 2, 3]), 2000);
    const end = setTimeout(() => handleEnd('timeout'), durationMs);
    return () => { clearTimeout(i1); clearTimeout(i2); clearTimeout(i3); clearTimeout(end); };
  }, [durationMs]);

  const handleEnd = (choice: string) => {
    const elapsed = Date.now() - startTime.current;
    onComplete({
      scenario_id: id, first_response_ms: elapsed, time_to_choice_ms: elapsed,
      interaction_count: 1, distraction_clicks: choice === 'read_chat' ? 1 : 0,
      re_read_count: 0, choice_made: choice, abandoned: choice === 'timeout'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="h-full flex flex-col justify-end">
      <div className="space-y-2 mb-8">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div key={m} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-secondary border border-subtle p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-violet-400" /></div>
              <div><p className="text-xs font-bold text-primary">Squad</p><p className="text-xs text-secondary">Bro answer ASAP!!</p></div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button onClick={() => handleEnd('swipe_away')} className="py-6 rounded-3xl bg-secondary border border-subtle font-black text-secondary active:scale-95 transition-transform">SWIPE AWAY</button>
        <button onClick={() => handleEnd('read_chat')} className="py-6 rounded-3xl bg-violet-600 text-white font-black active:scale-95 transition-transform shadow-lg shadow-violet-500/20">READ CHAT</button>
      </div>
    </motion.div>
  );
}

// ── S2: Conflicting Directions ────────────────────────────────────────────────

function ConflictingDirectionsScenario({ id, durationMs, onComplete }: any) {
  const startTime = useRef(Date.now());
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(t => t - 0.1), 100);
    const end = setTimeout(() => handleEnd('timeout'), durationMs);
    return () => { clearInterval(interval); clearTimeout(end); };
  }, [durationMs]);

  const handleEnd = (choice: string) => {
    const elapsed = Date.now() - startTime.current;
    onComplete({
      scenario_id: id, first_response_ms: elapsed, time_to_choice_ms: elapsed,
      interaction_count: 1, distraction_clicks: 0, re_read_count: 0, choice_made: choice, abandoned: choice === 'timeout'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center">
      <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden"><motion.div className="h-full bg-red-500" style={{ width: `${(timeLeft / (durationMs/1000)) * 100}%` }} /></div>
      <div className="mb-8 p-8 rounded-3xl bg-blue-500/10 border border-blue-500/20">
        <Navigation className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-blue-400">MAP: TURN LEFT</h2>
      </div>
      <div className="mb-10 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 animate-pulse">
        <h2 className="text-xl font-black text-amber-400">FRIEND: &quot;NO, IT&apos;S RIGHT!&quot;</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => handleEnd('visual')} className="py-5 rounded-2xl bg-blue-600 text-white font-black active:scale-95 text-lg">LEFT</button>
        <button onClick={() => handleEnd('audio')} className="py-5 rounded-2xl bg-amber-500 text-white font-black active:scale-95 text-lg">RIGHT</button>
      </div>
    </motion.div>
  );
}

// ── S3: FOMO Choice ───────────────────────────────────────────────────────────

function FomoChoiceScenario({ id, durationMs, onComplete }: any) {
  const startTime = useRef(Date.now());
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const end = setTimeout(() => handleEnd('timeout'), durationMs);
    return () => clearTimeout(end);
  }, [durationMs]);

  const handleEnd = (choice: string) => {
    const elapsed = Date.now() - startTime.current;
    onComplete({
      scenario_id: id, first_response_ms: elapsed, time_to_choice_ms: elapsed,
      interaction_count: 1, distraction_clicks: 0, re_read_count: 0, choice_made: choice, abandoned: choice === 'timeout'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-10">
      <h2 className="text-3xl font-black text-primary mb-2">Party in 10 mins.</h2>
      <p className="text-lg text-secondary mb-12 font-medium">Friend needs a ride.</p>
      
      <div className="flex flex-col gap-4">
        <button onClick={() => handleEnd('pickup')} className="w-full py-6 rounded-3xl bg-emerald-500 text-white font-black text-xl active:scale-95 shadow-lg shadow-emerald-500/20">
          PICK THEM UP (LATE)
        </button>
        <button onClick={() => handleEnd('straight')} className="w-full py-6 rounded-3xl bg-secondary border border-subtle text-primary font-black text-xl active:scale-95">
          GO STRAIGHT (ON TIME)
        </button>
      </div>
    </motion.div>
  );
}

// ── S4: Playlist Shuffle ────────────────────────────────────────────────────────

function PlaylistShuffleScenario({ id, durationMs, onComplete }: any) {
  const startTime = useRef(Date.now());
  const [showNotification, setShowNotification] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [isBraked, setIsBraked] = useState(false);
  const [isDistracted, setIsDistracted] = useState(false);
  const distClicks = useRef(0);
  const alertTime = useRef<number | null>(null);

  useEffect(() => {
    // Show playlist switcher link notification after 1.5 seconds
    const notifTimer = setTimeout(() => {
      setShowNotification(true);
    }, 1500);

    // Show red street brake alert after 3.2 seconds
    const alertTimer = setTimeout(() => {
      setShowAlert(true);
      alertTime.current = Date.now();
    }, 3200);

    const endTimer = setTimeout(() => {
      handleEnd('timeout');
    }, durationMs);

    return () => {
      clearTimeout(notifTimer);
      clearTimeout(alertTimer);
      clearTimeout(endTimer);
    };
  }, [durationMs]);

  const handleEnd = (choice: string) => {
    const elapsed = alertTime.current ? Date.now() - alertTime.current : Date.now() - startTime.current;
    onComplete({
      scenario_id: id,
      first_response_ms: elapsed,
      time_to_choice_ms: elapsed,
      interaction_count: distClicks.current + (choice === 'brake' ? 1 : 0),
      distraction_clicks: distClicks.current,
      re_read_count: 0,
      choice_made: choice,
      abandoned: choice === 'timeout'
    });
  };

  const handleDistractionClick = () => {
    distClicks.current++;
    setIsDistracted(true);
    setShowNotification(false);
  };

  const handleBrakeClick = () => {
    setIsBraked(true);
    handleEnd('brake');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="h-full flex flex-col justify-between relative py-6"
    >
      {/* Visual Road Windshield mockup */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 border border-subtle rounded-3xl p-6 relative overflow-hidden mb-6 min-h-[220px] shadow-inner">
        {/* Simulated lane lines */}
        <div className="absolute inset-y-0 w-1 bg-dashed bg-slate-800/60 left-1/2 -translate-x-1/2" />
        
        {/* Visual elements */}
        {showAlert ? (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }} 
            animate={{ scale: 1.1, opacity: 1 }} 
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="z-10 flex flex-col items-center justify-center bg-red-600/90 text-white px-6 py-4 rounded-2xl border border-red-500 shadow-2xl animate-pulse-soft"
          >
            <AlertOctagon className="w-12 h-12 text-white mb-2" />
            <span className="font-black text-lg uppercase tracking-wider">⚠️ STREET ALERT</span>
            <span className="text-xs font-bold uppercase opacity-90 mt-1">Obstacle Ahead! Brake Now!</span>
          </motion.div>
        ) : (
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest z-10 flex flex-col items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            Cruising safely at 45 MPH...
          </div>
        )}

        {/* Dynamic Warning Indicator when distracted */}
        {isDistracted && (
          <div className="absolute bottom-4 text-amber-500 text-xs font-black uppercase tracking-wider z-20 bg-slate-900/90 px-3 py-1 rounded-full border border-amber-500/20">
            ⚠️ Distracted! Vision delay triggered!
          </div>
        )}
      </div>

      {/* Playlist / Music Player and Phone notifications overlay */}
      <div className="w-full relative mb-6">
        <AnimatePresence>
          {showNotification && (
            <motion.div 
              initial={{ y: 30, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -30, opacity: 0 }}
              onClick={handleDistractionClick}
              className="bg-indigo-950/90 border border-indigo-500/40 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer hover:bg-indigo-900/60 transition-colors z-20"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-indigo-300">Incoming Notification</p>
                <p className="text-xs text-secondary leading-snug">🎵 Squad Album shared. Tap to stream now!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Music Widget playing in background if not distracted */}
        {!showNotification && (
          <div className="bg-secondary/40 border border-subtle p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-violet-400 animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold text-primary">Cruising Beats</p>
                <p className="text-[10px] text-muted font-medium">Song: Lofi Highway Driving</p>
              </div>
            </div>
            <button 
              onClick={handleDistractionClick}
              className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-violet-500/10 border border-subtle text-[10px] font-black text-violet-400 uppercase tracking-wider transition-all"
            >
              Skip Song
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full">
        <button 
          onClick={handleBrakeClick} 
          disabled={isBraked}
          className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-lg bg-red-600 hover:bg-red-700 active:scale-95 transition-transform"
        >
          {isBraked ? 'Braking...' : 'BRAKE'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Components Map ────────────────────────────────────────────────────────────

const SCENARIO_COMPONENTS: Record<string, React.ComponentType<any>> = {
  notification_storm: NotificationStormScenario,
  conflicting_directions: ConflictingDirectionsScenario,
  fomo_choice: FomoChoiceScenario,
  playlist_shuffle: PlaylistShuffleScenario,
};

// ── Calibration Orchestrator ──────────────────────────────────────────────────

function CalibrationPhase({ scenarios, onComplete }: any) {
  const [showBriefing, setShowBriefing] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [events, setEvents] = useState<CalibrationEventPayload[]>([]);

  const handleScenarioComplete = (payload: CalibrationEventPayload) => {
    const updated = [...events, payload];
    setEvents(updated);
    if (currentIdx < scenarios.length - 1) setCurrentIdx(i => i + 1);
    else onComplete(updated);
  };

  const currentScenario = scenarios[currentIdx];
  if (!currentScenario) return null;
  const Component = SCENARIO_COMPONENTS[currentScenario.ui_type];

  if (showBriefing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-8 py-6 text-center"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-blue-600 dark:bg-indigo-600 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-secondary border border-blue-500/30 dark:border-indigo-500/30">
            <Zap className="w-12 h-12 text-blue-500 dark:text-indigo-400" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-primary mb-2 uppercase tracking-tight leading-tight">
            Reflex &amp; Attention Test
          </h2>
          <p className="text-blue-500 dark:text-indigo-400 font-bold text-sm uppercase tracking-widest">
            Onboarding Calibration
          </p>
        </div>

        <div className="bg-secondary border border-subtle rounded-3xl p-6 text-left space-y-5 shadow-lg">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <span className="text-blue-500 dark:text-indigo-400 font-black text-sm">1</span>
            </div>
            <div>
              <p className="font-bold text-primary text-sm leading-snug">Follow the Primary Instructions</p>
              <p className="text-xs text-muted mt-0.5">You will face 4 quick tests. Follow the exact guidance shown at the top of the screen (e.g. tap the target repeatedly).</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <span className="text-blue-500 dark:text-indigo-400 font-black text-sm">2</span>
            </div>
            <div>
              <p className="font-bold text-primary text-sm leading-snug">Ignore Sudden Distractions</p>
              <p className="text-xs text-muted mt-0.5">Sudden DMs, group chat popups, or voice directions will try to trick you. Stay focused on your primary task!</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <span className="text-blue-500 dark:text-indigo-400 font-black text-sm">3</span>
            </div>
            <div>
              <p className="font-bold text-primary text-sm leading-snug">Calibrate Your AI Coach Profile</p>
              <p className="text-xs text-muted mt-0.5">Your distraction-resistance and response speed will shape your driving profile label and unlock your dashboard.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBriefing(false)}
          className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-lg shadow-blue-500/20"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
        >
          Start Calibration
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto relative flex flex-col justify-between min-h-[580px] py-4">
      {/* Instruction Banner at the Top to orient the user */}
      <div className="text-center mb-6 border-b border-subtle pb-4">
        <div className="flex justify-between items-center text-xs text-muted font-bold mb-2">
          <span className="text-violet-500 uppercase tracking-widest">Behavioral Test</span>
          <span>{currentIdx + 1} of {scenarios.length}</span>
        </div>
        <h3 className="text-xl font-black text-primary mb-1">
          {currentScenario.title}
        </h3>
        <p className="text-sm text-secondary font-medium px-2">
          {currentScenario.instruction}
        </p>
      </div>

      {/* Scenario Component Container */}
      <div className="flex-1 flex flex-col justify-center relative min-h-[420px]">
        <AnimatePresence mode="wait">
          {Component ? (
            <Component
              key={currentScenario.id}
              id={currentScenario.id}
              durationMs={currentScenario.duration_ms}
              onComplete={handleScenarioComplete}
            />
          ) : (
            <div className="text-center py-20 text-muted">Unknown scenario</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Processing Screen ─────────────────────────────────────────────────────────

function ProcessingScreen() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
      <Loader2 className="w-16 h-16 text-violet-500 animate-spin mx-auto mb-6" />
      <h2 className="text-3xl font-black text-primary mb-2">Calculating Rank</h2>
      <p className="text-secondary font-medium">Analyzing reaction speed...</p>
    </motion.div>
  );
}

// ── Result Phase ──────────────────────────────────────────────────────────────

function ResultPhase({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-6">
      
      <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm mb-2">
        +500 XP EARNED
      </div>

      <h2 className="text-4xl font-black text-primary uppercase italic">Class Unlocked</h2>

      <div className="grid grid-cols-2 gap-4 mt-8 mb-10">
        <div className="p-5 rounded-3xl bg-secondary border border-subtle">
          <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-muted font-bold mb-1">STARTING RANK</p>
          <p className="text-2xl font-black text-primary">Iron</p>
        </div>
        <div className="p-5 rounded-3xl bg-secondary border border-subtle">
          <Target className="w-8 h-8 text-violet-500 mx-auto mb-2" />
          <p className="text-xs text-muted font-bold mb-1">FIRST MISSION</p>
          <p className="text-sm font-black text-primary mt-1">Ready in Arena</p>
        </div>
      </div>

      <motion.button
        onClick={onContinue}
        className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-lg shadow-blue-500/20"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        Enter the Arena
      </motion.button>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);

  const [phase, setPhase] = useState<OnboardingPhase>('WELCOME');
  const [selectedMode, setSelectedMode] = useState<string>('focus');
  const [scenarios, setScenarios] = useState<CalibrationScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchData() {
      try {
        const sRes = await client.get('/onboarding/calibration/scenarios');
        setScenarios(sRes.data);
      } catch {
        toast.error('Failed to load scenarios.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) return null;

  const handleCalibrationComplete = async (events: CalibrationEventPayload[]) => {
    setPhase('PROCESSING');
    try {
      // First submit questionnaire answers
      if (questionnaireAnswers.length > 0) {
        await client.post('/onboarding/submit', { answers: questionnaireAnswers });
      }

      // Then submit calibration events
      const res = await client.post('/onboarding/calibration/submit', { events });
      
      // We don't care about the clinical report anymore, just gamification stats
      setTimeout(() => {
        setPhase('RESULT');
      }, 1500); // Fake delay for dramatic effect
      
      try {
        const label = res.data?.onboarding_profile_label || 'balanced';
        let mappedProfile = 'guardian';
        if (label === 'impulsive') {
          mappedProfile = 'bolt';
        } else if (label === 'notification_distracted' || label === 'distracted') {
          mappedProfile = 'phantom';
        } else if (label === 'risk_seeking') {
          mappedProfile = 'viper';
        } else if (label === 'emotionally_reactive' || label === 'hesitant') {
          mappedProfile = 'nova';
        } else if (label === 'cautious' || label === 'authority_driven' || label === 'balanced') {
          mappedProfile = 'guardian';
        }

        await updateProfile(mappedProfile);
        if (user && token) {
          dispatch(loginSuccess({ user: { ...user, profile_type: mappedProfile }, token }));
        }
      } catch {}
    } catch (err) {
      toast.error('Failed to process data.');
      setPhase('CALIBRATION');
    }
  };

  return (
    <>
      <Head><title>Reflex Test — SafeDrive AI</title></Head>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-app-shell bg-ambient-warm">
        <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>
        <div className="w-full max-w-md relative z-10 card-glass p-6 md:p-8 shadow-2xl border border-subtle">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" className="flex justify-center"><Loader2 className="w-8 h-8 text-blue-500 dark:text-indigo-400 animate-spin" /></motion.div>
            ) : phase === 'WELCOME' ? (
              <motion.div key="welcome"><WelcomePhase onBegin={() => setPhase('QUESTIONNAIRE')} /></motion.div>
            ) : phase === 'QUESTIONNAIRE' ? (
              <motion.div key="questionnaire">
                <QuestionnairePhase onComplete={(answers) => {
                  setQuestionnaireAnswers(answers);
                  setPhase('MODE_SELECTION');
                }} />
              </motion.div>
            ) : phase === 'MODE_SELECTION' ? (
              <motion.div key="mode_selection"><ModeSelectionPhase onSelect={(mode) => { setSelectedMode(mode); setPhase('CALIBRATION'); }} /></motion.div>
            ) : phase === 'CALIBRATION' ? (
              <motion.div key="calibration"><CalibrationPhase scenarios={scenarios} onComplete={handleCalibrationComplete} /></motion.div>
            ) : phase === 'PROCESSING' ? (
              <motion.div key="processing"><ProcessingScreen /></motion.div>
            ) : phase === 'RESULT' ? (
              <motion.div key="result"><ResultPhase onContinue={() => router.push('/dashboard')} /></motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
