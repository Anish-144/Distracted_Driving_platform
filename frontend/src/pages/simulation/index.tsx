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
import { ArrowLeft, Info, PlayCircle, Loader2, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

const scenarios = [
 { icon: 'ðŸ“±', name: 'Incoming Phone Call', desc: 'Your phone rings. Do you answer, decline, or ignore it?', difficulty: 'Medium', color: '#f59e0b' },
 { icon: 'ðŸ’¬', name: 'WhatsApp Notification', desc: 'A buzzing message notification with preview text appears.', difficulty: 'Easy', color: '#10b981' },
 { icon: 'ðŸ—ºï¸', name: 'GPS Rerouting Alert', desc: 'Your GPS needs attention â€” new route calculated, turn in 200m.', difficulty: 'Hard', color: '#ef4444' },
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
 toast.success('Session started! Get ready for distractions... ðŸš—');
 } catch { toast.error('Failed to start session. Please try again.'); }
 finally { setIsStarting(false); }
 };

 if (!isMounted) return null;
 if (!isAuthenticated) return null;

 return (
 <>
 <Head>
 <title>Driving Simulation â€” SafeDrive AI</title>
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
 Driving Simulation
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
 className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
 style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}
 animate={{ opacity: [0.1, 0.4, 0.1] }}
 transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
 >
 ðŸš—
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

 {/* Scenarios */}
 <FadeUp delay={0.1}>
 <p className={`${LABEL} mb-4 px-1`}>
 Scenarios You May Encounter
 </p>
 </FadeUp>

 <motion.div className="grid gap-3 mb-6" variants={stagger} initial="hidden" animate="visible">
 {scenarios.map((s) => (
 <motion.div key={s.name} variants={cardAnim}
 className={`${CARD} p-4 flex items-center gap-4 transition-all duration-200 group cursor-default`}
 whileHover={{ y: -2 }}>
 <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
 style={{ background: `${s.color}1a`, border: `1px solid ${s.color}33` }}>
 {s.icon}
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-bold text-primary text-sm">{s.name}</span>
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
 style={{ background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}33` }}>
 {s.difficulty}
 </span>
 </div>
 <p className="text-muted text-xs leading-relaxed">{s.desc}</p>
 </div>
 </motion.div>
 ))}
 </motion.div>

 {/* Rules */}
 <FadeUp delay={0.25}>
 <div className={`${CARD} p-5 mb-7 flex gap-3.5 items-start bg-blue-500/10 border-blue-500/20`}>
 <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
 <div className="text-sm text-secondary leading-relaxed">
 <span className="font-bold text-primary block mb-1">Scoring Rules</span>
 Safe decisions earn <span className="text-brand-400 font-bold bg-brand-500/10 px-1 rounded">+10 pts</span>.
 Risky interactions lose <span className="text-red-400 font-bold bg-red-500/10 px-1 rounded">-15 to -20 pts</span>.
 Reaction time scaling applies.
 </div>
 </div>
 </FadeUp>

 {/* Begin CTA */}
 <FadeUp delay={0.3}>
 <motion.button
 id="begin-simulation-btn"
 onClick={handleStartSession}
 disabled={isStarting}
 className="btn-primary w-full py-4 text-lg"
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.98 }}
 transition={{ duration: 0.15 }}
 >
 <span className="relative z-10 flex items-center gap-2 py-1">
 {isStarting ? (<><Loader2 className="w-5 h-5 animate-spin" />Starting Session...</>) : (<><PlayCircle className="w-5 h-5" />Begin Simulation</>)}
 </span>
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
