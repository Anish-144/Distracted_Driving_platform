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

const CARD = 'bg-white rounded-2xl border border-gray-200/70 shadow-sm';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowAnim = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function ProgressPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, isLoading } = useAppSelector((state) => state.progress);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Frontend behavioral state logic has been entirely removed.
  // The backend API (/api/progress/me) is now the sole source of truth for 
  // historical timelines, percentile aggregation, and analytics.
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf9' }}>
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>Progress — SafeDrive AI</title></Head>

      <AppShell>
        {/* Header */}
        <FadeUp className="mb-8">
          <p className={`${LABEL} text-emerald-600 mb-1`}>Analytics</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
              <BarChart2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Your Progress</h1>
          </div>
        </FadeUp>

        {/* Metrics card */}
        {!isLoading && (
          <FadeUp delay={0.1} className="mb-6">
            <div className={`${CARD} p-7 relative overflow-hidden`}>
              <div className="flex items-center gap-2.5 mb-5 relative z-10">
                <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <AlertCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Detailed Progress Metrics</h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 relative z-10">
                You have completed <strong className="text-gray-900">{stats?.total_sessions || 0}</strong> sessions. Your current driver profile is classified as{' '}
                <span className="font-bold text-emerald-600">
                  {stats?.driver_type || 'Unknown'}
                </span>.
              </p>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 relative z-10">
                {[
                  { label: 'Avg Score', value: stats?.avg_score || 0, color: '#059669', bg: '#f0fdf4', border: '#d1fae5' },
                  { label: 'Improvement', value: `${(stats?.improvement_rate || 0) > 0 ? '+' : ''}${stats?.improvement_rate || 0}`, color: (stats?.improvement_rate || 0) >= 0 ? '#059669' : '#ef4444', bg: (stats?.improvement_rate || 0) >= 0 ? '#f0fdf4' : '#fef2f2', border: (stats?.improvement_rate || 0) >= 0 ? '#d1fae5' : '#fee2e2' },
                ].map((m) => (
                  <div key={m.label} className="text-center p-5 rounded-xl border" style={{ background: m.bg, borderColor: m.border }}>
                    <p className={`${LABEL} mb-2`}>{m.label}</p>
                    <motion.p
                      className="text-3xl font-bold tracking-tight"
                      style={{ color: m.color }}
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
            <div className={`${CARD} p-7`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <Target className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Progress Timeline</h2>
                </div>

                {timeline.length > 1 && (
                  <motion.div
                    className="px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 self-start sm:self-auto"
                    style={{
                      background: overallDelta >= 0 ? '#f0fdf4' : '#fef2f2',
                      color: overallDelta >= 0 ? '#059669' : '#dc2626',
                      border: `1px solid ${overallDelta >= 0 ? '#d1fae5' : '#fee2e2'}`,
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
                <div className="text-center py-10 rounded-xl bg-gray-50 border border-gray-100">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-900">Need more data</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Complete at least 2 simulation sessions to visualize your progress timeline.</p>
                  <button onClick={() => router.push('/simulation')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 transition-all duration-200 hover:bg-emerald-100 inline-flex items-center gap-2">
                    <Target className="w-4 h-4" />Start Simulation
                  </button>
                </div>
              ) : (
                <motion.div className="flex flex-col gap-3" variants={stagger} initial="hidden" animate="visible">
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
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-3 sm:gap-0 transition-all duration-200 border ${isLatest ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold w-8" style={{ color: isLatest ? '#059669' : '#9ca3af' }}>#{originalIdx + 1}</span>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 flex items-center">
                              Rank: <strong style={{ color: isLatest ? '#059669' : '#4b5563' }} className="ml-1">{sc}%</strong>
                              {isLatest && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">Latest</span>}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />{dateStr}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center self-start sm:self-auto gap-3">
                          {/* Minibar */}
                          <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden hidden sm:block">
                            <motion.div className="h-full rounded-full"
                              style={{ background: sc >= 80 ? '#059669' : sc >= 60 ? '#10b981' : sc >= 40 ? '#f59e0b' : '#ef4444' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${sc}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                            />
                          </div>
                          {originalIdx > 0 && diff !== 0 ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                                  style={{ background: diff > 0 ? '#f0fdf4' : '#fef2f2', color: diff > 0 ? '#059669' : '#dc2626', border: `1px solid ${diff > 0 ? '#d1fae5' : '#fee2e2'}` }}>
                              {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <MoveRight className="w-3 h-3" />steady
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
