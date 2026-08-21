import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { sessionStarted, sessionEnded, sessionReset } from '@/store/sessionSlice';
import { createSession } from '@/api/sessions';
import AppShell from '@/components/layout/AppShell';
import ScenarioContainer from '@/components/simulation/ScenarioContainer';
import ScoreDisplay from '@/components/simulation/ScoreDisplay';
import SimulationVoiceOverlay from '@/components/voice/SimulationVoiceOverlay';
import { motion } from 'framer-motion';
import { FadeUp } from '@/components/motion/ScrollReveal';
import { ArrowLeft, Info, PlayCircle, Loader2, Shield, Zap, Phone, MessageCircle, MapPinned, Car, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';

const scenarios = [
 { icon: <Phone className="w-6 h-6" />, name: 'Incoming Phone Call', desc: 'Your phone rings. Do you answer, decline, or ignore it?', difficulty: 'High', color: '#f59e0b' },
 { icon: <MessageCircle className="w-6 h-6" />, name: 'WhatsApp Notification', desc: 'A buzzing message notification with preview text appears.', difficulty: 'Medium', color: '#10b981' },
 { icon: <MapPinned className="w-6 h-6" />, name: 'GPS Rerouting Alert', desc: 'Your GPS needs attention — new route calculated, turn in 200m.', difficulty: 'Medium', color: '#ef4444' },
 { icon: <Mail className="w-6 h-6" />, name: 'Email Alert', desc: 'A low urgency work email notification pops up on your screen.', difficulty: 'Low', color: '#eab308' },
 { icon: <Smartphone className="w-6 h-6" />, name: 'Social Media', desc: 'An ambient social media notification buzzes your device.', difficulty: 'Low', color: '#a855f7' },
 { icon: <Zap className="w-6 h-6" />, name: 'Passenger Question', desc: 'Your passenger asks something that demands a thoughtful answer.', difficulty: 'Medium', color: '#ec4899' },
 { icon: <Zap className="w-6 h-6" />, name: 'Radio Distraction', desc: 'A radio segment or song pulls your attention away from the road.', difficulty: 'Low', color: '#f97316' },
 { icon: <Zap className="w-6 h-6" />, name: 'Roadside Event', desc: 'An unusual roadside sight tempts you to look and lose focus.', difficulty: 'Medium', color: '#06b6d4' },
];

const stagger = {
 hidden: {},
 visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const cardAnim = {
 hidden: { opacity: 0, y: 20, scale: 0.97 },
 visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const CARD = 'card relative overflow-hidden';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted';

export default function SimulationPage() {
 const router = useRouter();
 const dispatch = useAppDispatch();
 const { isAuthenticated } = useAppSelector((state) => state.auth);
 const { sessionId, isSimulating, score } = useAppSelector((state) => state.session);
 const [isStarting, setIsStarting] = useState(false);
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => { setIsMounted(true); }, []);

 useEffect(() => { if (!isAuthenticated && isMounted) router.replace('/auth/login'); }, [isAuthenticated, router, isMounted]);
 useEffect(() => { return () => { dispatch(sessionReset()); }; }, [dispatch]);

 const handleStartSession = async () => {
 setIsStarting(true);
 try {
 const session = await createSession();
 dispatch(sessionStarted({ sessionId: session.id, score: session.score }));
 toast.success('Session started! Get ready for distractions...');
 } catch { toast.error('Failed to start session. Please try again.'); }
 finally { setIsStarting(false); }
 };

 if (!isMounted) return null;
 if (!isAuthenticated) return null;

 return (
 <>
 <Head>
 <title>Driving Simulation — SafeDrive AI</title>
 <meta name="description" content="Practice responding to driving distractions in a safe training environment." />
 </Head>

 <AppShell maxWidth="wide">
   {/* Floating voice indicator */}
   <SimulationVoiceOverlay />
   {/* Header */}
  <div className="flex items-center justify-between mb-8">
  <div className="flex items-center gap-4">
  <Link href="/dashboard"
  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
  isSimulating 
  ? 'bg-secondary text-muted border border-subtle hover:bg-tertiary' 
  : 'bg-secondary text-secondary border border-subtle hover:bg-tertiary hover:text-primary'
  }`}
  >
  <ArrowLeft className="w-4 h-4" />
  Dashboard
  </Link>
  <div className={`w-px h-6 bg-tertiary`} />
  <h1 className={`text-2xl font-bold tracking-tight text-primary`}>
  Driving Simulation
  </h1>
  </div>
  {isSimulating && <ScoreDisplay score={score} />}
  </div>

  {!isSimulating ? (
  <div className="w-full max-w-7xl mx-auto space-y-6">
  {/* Hero intro card — widescreen briefing */}
  <FadeUp>
  <div className={`${CARD} p-8 text-center md:text-left flex flex-col md:flex-row items-center gap-6 justify-between`}>
  <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
  style={{ background: 'radial-gradient(circle,rgba(5,150,105,0.1) 0%,transparent 70%)' }} />
  <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
  style={{ background: 'radial-gradient(circle,rgba(8,145,178,0.1) 0%,transparent 70%)' }} />

  <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
    <motion.div
    className="w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-500 flex-shrink-0"
    style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}
    animate={{ opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
    <Car className="w-8 h-8" />
    </motion.div>

    <div>
      <h2 className="text-2xl font-bold text-primary tracking-tight mb-2">Ready to Drive?</h2>
      <p className="text-muted text-sm leading-relaxed max-w-2xl">
      You will face <span className="text-brand-400 font-semibold">5 randomized driving distractions</span> selected from 8 distinct hazard types. For each event, decide to{' '}
      <span className="text-brand-400 font-semibold">ignore it safely</span> or{' '}
      <span className="text-red-400 font-semibold">interact with it</span>.
      Reaction time, escalation pressure, and choices directly calibrate your cognitive score.
      </p>
    </div>
  </div>

  <div className="relative z-10 flex-shrink-0 w-full md:w-auto">
    <motion.button
    id="begin-simulation-btn"
    onClick={handleStartSession}
    disabled={isStarting}
    className="btn-primary w-full md:w-auto px-8 py-4 text-base font-bold shadow-lg"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15 }}
    >
    <span className="relative z-10 flex items-center justify-center gap-2">
    {isStarting ? (<><Loader2 className="w-5 h-5 animate-spin" />Starting Session...</>) : (<><PlayCircle className="w-5 h-5" />Begin Simulation</>)}
    </span>
    </motion.button>
  </div>
  </div>
  </FadeUp>

  {/* Scenarios Header */}
  <FadeUp delay={0.1}>
  <div className="flex items-center justify-between px-1">
    <p className={`${LABEL}`}>
    8 Scenario Types · 5 Rapid Events Per Session
    </p>
    <span className="text-xs text-muted">Randomized live selection</span>
  </div>
  </FadeUp>

  {/* 4-column Scenario Grid */}
  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={stagger} initial="hidden" animate="visible">
  {scenarios.map((s) => (
  <motion.div key={s.name} variants={cardAnim}
  className={`${CARD} p-4 flex flex-col justify-between gap-3 transition-all duration-200 group cursor-default`}
  whileHover={{ y: -3 }}>
  <div className="flex items-start justify-between">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
    style={{ background: `${s.color}1a`, border: `1px solid ${s.color}33` }}>
    {s.icon}
    </div>
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
    style={{ background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}33` }}>
    {s.difficulty}
    </span>
  </div>
  <div>
    <h3 className="font-bold text-primary text-sm mb-1">{s.name}</h3>
    <p className="text-muted text-xs leading-relaxed line-clamp-2">{s.desc}</p>
  </div>
  </motion.div>
  ))}
  </motion.div>

  {/* Rules & Scoring */}
  <FadeUp delay={0.2}>
  <div className={`${CARD} p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-blue-500/10 border-blue-500/20`}>
    <div className="flex items-center gap-3">
      <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
      <div className="text-xs sm:text-sm text-secondary leading-relaxed">
      <span className="font-bold text-primary mr-2">Scoring Rules:</span>
      Safe decisions earn <span className="text-brand-400 font-bold bg-brand-500/10 px-1 rounded">+10 pts</span>.
      Risky interactions lose <span className="text-red-400 font-bold bg-red-500/10 px-1 rounded">-15 to -20 pts</span>.
      Split-second reaction timing applies.
      </div>
    </div>
    <div className="text-xs text-blue-300/80 font-mono flex-shrink-0">
      Adaptive Difficulty: Active
    </div>
  </div>
  </FadeUp>
  </div>
  ) : (
   <div className="w-full">
    <ScenarioContainer sessionId={sessionId!} />
   </div>
  )}
  </AppShell>
 </>
 );
}
