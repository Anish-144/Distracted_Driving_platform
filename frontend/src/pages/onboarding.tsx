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
  MessageCircle, BellRing, Smartphone, Navigation, Clock, Flame
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

// ── Types ─────────────────────────────────────────────────────────────────────

type OnboardingPhase = 'WELCOME' | 'MODE_SELECTION' | 'CALIBRATION' | 'PROCESSING' | 'RESULT';

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
        <div className="absolute inset-0 rounded-full blur-3xl opacity-30 bg-violet-600 animate-pulse" />
        <div className="relative w-32 h-32 rounded-full flex items-center justify-center bg-secondary border-2 border-violet-500 shadow-2xl">
          <Zap className="w-16 h-16 text-violet-400" />
        </div>
      </div>

      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-primary tracking-tight mb-2"
        >
          Reflex Test
        </motion.h1>
        <p className="text-secondary text-lg font-medium">Fast. Instinctive. No overthinking.</p>
      </div>

        <motion.button
        onClick={onBegin}
        className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-xl shadow-violet-500/20"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        Select Mode
      </motion.button>
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

// ── S4: Phantom Buzz ──────────────────────────────────────────────────────────

function PhantomBuzzScenario({ id, durationMs, onComplete }: any) {
  const startTime = useRef(Date.now());
  const [taps, setTaps] = useState(0);
  const [showDM, setShowDM] = useState(false);
  const distClicks = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const dmTimer = setTimeout(() => setShowDM(true), 3000);
    const end = setTimeout(() => handleEnd(), durationMs);
    return () => { clearTimeout(dmTimer); clearTimeout(end); };
  }, [durationMs]);

  const handleEnd = () => {
    onComplete({
      scenario_id: id, first_response_ms: Date.now() - startTime.current, time_to_choice_ms: Date.now() - startTime.current,
      interaction_count: taps, distraction_clicks: distClicks.current, re_read_count: 0, choice_made: 'completed', abandoned: false
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative py-10">
      <AnimatePresence>
        {showDM && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 inset-x-0 mx-4 bg-zinc-900 border border-zinc-800 p-4 rounded-3xl shadow-2xl flex items-center gap-3 z-50 cursor-pointer" onClick={() => { distClicks.current++; setShowDM(false); }}>
            <img src="https://ui-avatars.com/api/?name=Crush&background=random" className="w-10 h-10 rounded-full" alt="avatar" />
            <div><p className="text-sm font-bold text-white">Crush sent a message</p><p className="text-xs text-zinc-400">Tap to view</p></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mt-20">
        <h2 className="text-2xl font-black text-primary mb-10">TAP TO CALIBRATE</h2>
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setTaps(t => t + 1)} 
          className="w-40 h-40 rounded-full bg-violet-600/20 border-4 border-violet-500 flex items-center justify-center mx-auto"
        >
          <Target className="w-16 h-16 text-violet-500" />
        </motion.button>
        <p className="mt-8 text-xl font-bold text-violet-400">{taps} TAPS</p>
      </div>
    </motion.div>
  );
}

// ── Components Map ────────────────────────────────────────────────────────────

const SCENARIO_COMPONENTS: Record<string, React.ComponentType<any>> = {
  notification_storm: NotificationStormScenario,
  conflicting_directions: ConflictingDirectionsScenario,
  fomo_choice: FomoChoiceScenario,
  phantom_buzz: PhantomBuzzScenario,
};

// ── Calibration Orchestrator ──────────────────────────────────────────────────

function CalibrationPhase({ scenarios, onComplete }: any) {
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

  return (
    <div className="h-[500px] w-full max-w-sm mx-auto relative">
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
        className="w-full py-5 rounded-3xl font-black text-white text-xl uppercase tracking-wider shadow-xl shadow-violet-500/20"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
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
      // Create user profile by submitting to the calibration endpoint
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-app-shell">
        <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>
        <div className="w-full max-w-md relative z-10">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" className="flex justify-center"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></motion.div>
            ) : phase === 'WELCOME' ? (
              <motion.div key="welcome"><WelcomePhase onBegin={() => setPhase('MODE_SELECTION')} /></motion.div>
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
