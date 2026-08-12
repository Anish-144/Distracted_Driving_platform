import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import AppShell from '@/components/layout/AppShell';
import { motion } from 'framer-motion';
import { FadeUp } from '@/components/motion/ScrollReveal';
import { BarChart2, AlertCircle, Target, TrendingUp, TrendingDown, Clock, MoveRight } from 'lucide-react';

interface TimelineEntry {
  session_id: string;
  percentile: number;
  timestamp: number;
  score: number;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowAnim = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, isLoading } = useAppSelector((state) => state.progress);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const timeline = stats?.timeline || [];

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    dispatch(fetchProgressData());
  }, [isAuthenticated, router, dispatch]);

  const firstScore = timeline.length > 0 ? timeline[0].score : 0;
  const lastScore = timeline.length > 0 ? timeline[timeline.length - 1].score : 0;
  const overallDelta = lastScore - firstScore;

  if (!isMounted) return null;

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-5 h-5 border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <>
      <Head><title>Progress — SafeDrive AI</title></Head>

      <AppShell>
        {/* Header */}
        <FadeUp className="mb-6">
          <SectionLabel>Analytics</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: '#C8FF00', borderRadius: '4px' }}>
              <BarChart2 className="w-4 h-4" style={{ color: '#1A1814' }} />
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Your Progress
            </h1>
          </div>
        </FadeUp>

        {/* Metrics card */}
        {!isLoading && (
          <FadeUp delay={0.1} className="mb-6">
            <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Detailed Progress Metrics</h2>
              </div>
              <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                You have completed <strong style={{ color: 'var(--text-primary)' }}>{stats?.total_sessions || 0}</strong> sessions. Your current driver profile is classified as{' '}
                <span className="font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
                  {stats?.driver_type?.replace('_', ' ') || 'Unknown'}
                </span>.
              </p>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
                {[
                  { label: 'Avg Score', value: stats?.avg_score || 0 },
                  { label: 'Improvement', value: `${(stats?.improvement_rate || 0) > 0 ? '+' : ''}${stats?.improvement_rate || 0}` },
                ].map((m) => (
                  <div key={m.label} className="p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                    <SectionLabel>{m.label}</SectionLabel>
                    <motion.p
                      className="text-3xl font-bold mono-data"
                      style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    >
                      {m.value}
                    </motion.p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        )}

        {/* Timeline */}
        {!isLoading && timeline.length > 0 && (
          <FadeUp delay={0.2}>
            <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Progress Timeline</h2>
                </div>

                {timeline.length > 1 && (
                  <motion.div
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded flex items-center gap-1.5 self-start sm:self-auto"
                    style={{
                      background: 'var(--bg-surface-raised)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    {overallDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {overallDelta > 15 ? 'Incredible improvement' : overallDelta > 5 ? 'Great progress' : overallDelta > 0 ? 'Steady improvement' : overallDelta === 0 ? 'Consistent trends' : 'Declining performance'} by {Math.abs(overallDelta)}% over {timeline.length} sessions
                  </motion.div>
                )}
              </div>

              {timeline.length < 2 ? (
                <div className="text-center py-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                  <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Need more data</p>
                  <p className="text-[11px] mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Complete at least 2 simulation sessions to visualize your progress timeline.</p>
                  <button onClick={() => router.push('/simulation')}
                    className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 mx-auto transition-colors duration-100"
                    style={{ background: '#1A1814', color: '#C8FF00', borderRadius: '4px' }}>
                    START SIMULATION <MoveRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <motion.div className="flex flex-col gap-2" variants={stagger} initial="hidden" animate="visible">
                  {[...timeline].reverse().map((entry, reverseIdx) => {
                    const originalIdx = timeline.length - 1 - reverseIdx;
                    const sc = entry.score;
                    const prevScore = originalIdx > 0 ? timeline[originalIdx - 1].score : sc;
                    const diff = sc - prevScore;
                    const dateStr = new Date(entry.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                    const isLatest = reverseIdx === 0;

                    return (
                      <motion.div
                        key={originalIdx}
                        variants={rowAnim}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 sm:gap-0 transition-colors duration-200"
                        style={{
                          background: isLatest ? 'var(--bg-surface-raised)' : 'var(--bg-surface)',
                          border: `1px solid ${isLatest ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                          borderRadius: '4px'
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold w-8 mono-data" style={{ color: isLatest ? 'var(--text-primary)' : 'var(--text-muted)' }}>#{originalIdx + 1}</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
                              Rank: <strong className="ml-1 mono-data">{sc}%</strong>
                              {isLatest && <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5" style={{ background: '#C8FF00', color: '#1A1814', borderRadius: '3px' }}>Latest</span>}
                            </span>
                            <span className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              <Clock className="w-3 h-3" />{dateStr}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center self-start sm:self-auto gap-3">
                          {/* Minibar */}
                          <div className="w-24 h-1.5 overflow-hidden hidden sm:block" style={{ background: 'var(--border-subtle)', borderRadius: '2px' }}>
                            <motion.div className="h-full"
                              style={{ background: 'var(--text-primary)', borderRadius: '2px' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${sc}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                            />
                          </div>
                          {originalIdx > 0 && diff !== 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 uppercase flex items-center gap-1"
                              style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '3px' }}>
                              {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 uppercase flex items-center gap-1"
                              style={{ background: 'var(--bg-canvas)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
                              <MoveRight className="w-2.5 h-2.5" />STEADY
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </FadeUp>
        )}
      </AppShell>
    </>
  );
}
