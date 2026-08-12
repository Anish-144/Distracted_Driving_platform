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
import { ArrowLeft, Info, PlayCircle, Loader2, Car, Phone, MessageCircle, MapPinned, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';

const scenarios = [
  { icon: <Phone className="w-5 h-5" />, name: 'Incoming Phone Call', desc: 'Your phone rings. Do you answer, decline, or ignore it?', difficulty: 'High', color: '#1A1814' },
  { icon: <MessageCircle className="w-5 h-5" />, name: 'WhatsApp Notification', desc: 'A buzzing message notification with preview text appears.', difficulty: 'Medium', color: '#1A1814' },
  { icon: <MapPinned className="w-5 h-5" />, name: 'GPS Rerouting Alert', desc: 'Your GPS needs attention — new route calculated, turn in 200m.', difficulty: 'Medium', color: '#1A1814' },
  { icon: <Mail className="w-5 h-5" />, name: 'Email Alert', desc: 'A low urgency work email notification pops up on your screen.', difficulty: 'Low', color: '#1A1814' },
  { icon: <Smartphone className="w-5 h-5" />, name: 'Social Media', desc: 'An ambient social media notification buzzes your device.', difficulty: 'Low', color: '#1A1814' },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

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

      <AppShell>
        {/* Floating voice indicator */}
        <SimulationVoiceOverlay />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-150"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              BACK
            </Link>
            <div className="w-px h-5" style={{ background: 'var(--border-subtle)' }} />
            <h1 className="text-xl font-bold tracking-tight uppercase" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Simulation Area
            </h1>
          </div>
          {isSimulating && <ScoreDisplay score={score} />}
        </div>

        {!isSimulating ? (
          <div className="max-w-2xl mx-auto">
            {/* Hero intro card */}
            <FadeUp>
              <div className="p-8 mb-6 text-center border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '4px' }}>
                <motion.div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                  style={{ background: '#C8FF00', borderRadius: '4px' }}
                >
                  <Car className="w-7 h-7" style={{ color: '#1A1814' }} />
                </motion.div>

                <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Ready to Drive?</h2>
                <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  You'll face realistic driving distractions. For each event, decide to{' '}
                  <span className="font-bold underline decoration-[#C8FF00] decoration-2" style={{ color: 'var(--text-primary)' }}>ignore it safely</span> or{' '}
                  <span className="font-bold underline decoration-[#8B2020] decoration-2" style={{ color: 'var(--text-primary)' }}>interact with it</span>.
                  Your reaction time and choices affect your score.
                </p>
              </div>
            </FadeUp>

            {/* Scenarios */}
            <FadeUp delay={0.1}>
              <SectionLabel>Scenarios You May Encounter</SectionLabel>
            </FadeUp>

            <motion.div className="grid gap-2 mb-6" variants={stagger} initial="hidden" animate="visible">
              {scenarios.map((s) => (
                <motion.div key={s.name} variants={cardAnim}
                  className="p-3 flex items-center gap-4 transition-colors duration-200 border"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '4px' }}
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--text-primary)' }}>{s.icon}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider"
                        style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
                        {s.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Rules */}
            <FadeUp delay={0.25}>
              <div className="p-4 mb-6 flex gap-3 items-start border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '4px' }}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-primary)' }} />
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-primary)' }}>Scoring Rules</span>
                  Safe decisions earn <span className="font-bold uppercase tracking-widest px-1 py-0.5 mx-0.5" style={{ background: '#C8FF00', color: '#1A1814', borderRadius: '2px' }}>+10 pts</span>.
                  Risky interactions lose <span className="font-bold uppercase tracking-widest px-1 py-0.5 mx-0.5" style={{ background: 'var(--bg-canvas)', color: '#8B2020', border: '1px solid #8B2020', borderRadius: '2px' }}>-15 to -20 pts</span>.
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
                className="w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
                style={{ background: '#1A1814', color: '#C8FF00', borderRadius: '4px', fontFamily: 'Space Grotesk, sans-serif' }}
                whileHover={{ background: '#2D2A24' }}
                whileTap={{ scale: 0.98 }}
              >
                {isStarting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />STARTING...</>
                ) : (
                  <><PlayCircle className="w-4 h-4" />BEGIN SIMULATION</>
                )}
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
