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

import { useSoundEffects } from '@/hooks/useSoundEffects';
import PassengerSelector from '@/components/simulation/PassengerSelector';

const missionProfiles = [
  { id: 'adaptive', name: 'GHOST MODE', desc: 'AI dynamically tailors distractions to your specific weaknesses.', icon: <Zap className="w-6 h-6" />, color: '#8b5cf6', difficulty: 'Dynamic', xpBonus: '+20%' },
  { id: 'highway', name: 'OPEN ROAD', desc: 'High speed, long-form distractions like phone calls.', icon: <MapPinned className="w-6 h-6" />, color: '#3b82f6', difficulty: 'Standard', xpBonus: '+0%' },
  { id: 'city', name: 'THE GRID', desc: 'Rapid-fire notifications and high social pressure.', icon: <MessageCircle className="w-6 h-6" />, color: '#ef4444', difficulty: 'Hard', xpBonus: '+50%' },
  { id: 'night', name: 'BLACKOUT', desc: 'Low visibility with sudden priority alerts.', icon: <Shield className="w-6 h-6" />, color: '#10b981', difficulty: 'Expert', xpBonus: '+100%' }
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
 const [selectedMission, setSelectedMission] = useState('adaptive');
 const { playClick, playPop, playDing } = useSoundEffects();

 useEffect(() => { setIsMounted(true); }, []);

 useEffect(() => { if (!isAuthenticated && isMounted) router.replace('/auth/login'); }, [isAuthenticated, router, isMounted]);
 useEffect(() => { return () => { dispatch(sessionReset()); }; }, [dispatch]);

 const handleStartSession = async () => {
   playDing();
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

 <AppShell>
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
 ARENA
 </h1>
 </div>
 {isSimulating && <ScoreDisplay score={score} />}
 </div>

 {!isSimulating ? (
 <div className="max-w-2xl mx-auto">
 {/* Hero intro card */}
 <FadeUp>
 <div className={`${CARD} p-8 mb-7 text-center`}>
 <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
 style={{ background: 'radial-gradient(circle,rgba(5,150,105,0.1) 0%,transparent 70%)' }} />
 <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none"
 style={{ background: 'radial-gradient(circle,rgba(8,145,178,0.1) 0%,transparent 70%)' }} />

 <motion.div
 className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500"
 style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}
 animate={{ opacity: [0.1, 0.4, 0.1] }}
 transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
 >
 <Car className="w-8 h-8" />
 </motion.div>

 <div className="relative z-10">
 <h2 className="text-xl font-bold text-primary tracking-tight mb-2">Ready to Drive?</h2>
 <p className="text-muted text-sm leading-relaxed max-w-sm mx-auto">
 You&apos;ll face realistic driving distractions. For each event, decide to{' '}
 <span className="text-brand-400 font-semibold">ignore it safely</span> or{' '}
 <span className="text-red-400 font-semibold">interact with it</span>.
 Your reaction time and choices affect your score.
 </p>
 </div>
 </div>
 </FadeUp>

  {/* Passenger Selector */}
  <FadeUp delay={0.08}>
  <div className="mb-7">
    <PassengerSelector />
  </div>
  </FadeUp>

  {/* Mission Select Grid */}
  <FadeUp delay={0.1}>
  <p className={`${LABEL} mb-4 px-1 flex items-center justify-between`}>
  <span>Select Mission Profile</span>
  <span className="text-brand-400 flex items-center gap-1"><span className="text-sm">🔥</span> MULTIPLIER</span>
  </p>
  </FadeUp>

  <motion.div className="grid sm:grid-cols-2 gap-3 mb-8" variants={stagger} initial="hidden" animate="visible">
  {missionProfiles.map((m) => {
    const isSelected = selectedMission === m.id;
    return (
      <motion.div
        key={m.id}
        variants={cardAnim}
        onClick={() => {
          setSelectedMission(m.id);
          playClick();
        }}
        className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'bg-secondary ring-2 ring-brand-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
            : 'bg-primary border border-subtle hover:border-strong hover:bg-secondary'
        }`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSelected && (
          <div className="absolute top-3 right-3 text-brand-500">
            <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        )}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 mb-4"
        style={{ background: `linear-gradient(135deg, ${m.color}, #1e293b)`, boxShadow: `0 4px 12px ${m.color}40` }}>
          {m.icon}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-primary text-base">{m.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: `${m.color}1a`, color: m.color, border: `1px solid ${m.color}33` }}>
              {m.difficulty}
            </span>
          </div>
          <p className="text-muted text-sm leading-relaxed mb-3">{m.desc}</p>
          <div className="text-xs font-bold flex items-center gap-1" style={{ color: m.color }}>
            <span className="text-sm">🔥</span> {m.xpBonus} BONUS MULTIPLIER
          </div>
        </div>
      </motion.div>
    );
  })}
  </motion.div>

  {/* Begin CTA */}
  <FadeUp delay={0.3}>
  <motion.button
  id="begin-simulation-btn"
  onClick={handleStartSession}
  onMouseEnter={() => playPop()}
  disabled={isStarting}
  className="w-full py-4 rounded-2xl text-lg font-black text-white shadow-[0_8px_32px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2"
  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
  whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(99,102,241,0.6)' }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15 }}
  >
  {isStarting ? (<><Loader2 className="w-5 h-5 animate-spin" />Deploying Scenario...</>) : (<><PlayCircle className="w-5 h-5" />Launch {missionProfiles.find(m => m.id === selectedMission)?.name}</>)}
  </motion.button>
  </FadeUp>
 </div>
 ) : (
 <ScenarioContainer sessionId={sessionId!} />
 )}
 </AppShell>
 </>
 );
}
