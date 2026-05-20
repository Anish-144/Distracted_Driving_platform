import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import { getLatestSession, LatestSessionData, isRequestCancelled as isSessionCancelled } from '@/api/sessions';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
  Shield, TrendingUp, Clock, Car, PlayCircle, ChevronRight,
  Activity, Phone, MessageCircle, MapPin, AlertTriangle, ArrowUpRight, Zap,
} from 'lucide-react';

// ── Design tokens (all in one place) ──────────────────────────────────────────
const CARD = 'bg-white rounded-2xl border border-gray-200/70 shadow-sm';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { stats, lessons, isLoading } = useAppSelector((s) => s.progress);
  const { score: reduxScore } = useAppSelector((s) => s.session);

  const [latestData, setLatestData] = useState<LatestSessionData | null>(null);
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [localSessionData, setLocalSessionData] = useState<{
    percentile: string | number | null;
    best: string | number | null;
    delta: { val: number; status: string } | null;
    insights: string[] | null;
    timestamp: string | null;
  }>({ percentile: null, best: null, delta: null, insights: null, timestamp: null });

  // ── Latest session fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetchingLatest(true);
    getLatestSession(controller.signal)
      .then((res) => { setLatestData(res); })
      .catch((err) => {
        if (isSessionCancelled(err)) return;
        const status = err?.response?.status;
        if (!status || status >= 500) return; // backend down — silent
        toast.error('Could not load your latest session data.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsFetchingLatest(false); });
    return () => { controller.abort(); setIsFetchingLatest(false); };
  }, [isAuthenticated]);

  // ── Progress fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    dispatch(fetchProgressData()).unwrap().catch(() => {});
  }, [isAuthenticated, router, dispatch]);

  // ── localStorage cache ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      const payloadStr = localStorage.getItem('sd_dashboard_last_session');
      const b = localStorage.getItem('best_user_percentile');
      if (!payloadStr) return;
      const payload = JSON.parse(payloadStr);
      if (
        payload?.v === 1 && payload.percentile !== undefined &&
        payload.delta && typeof payload.delta.val === 'number' &&
        typeof payload.delta.status === 'string'
      ) {
        const formattedTime = payload.unix_timestamp
          ? new Date(payload.unix_timestamp).toLocaleString(undefined, {
              hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', hour12: true,
            })
          : null;
        setLocalSessionData({
          percentile: payload.percentile,
          best: b || payload.percentile.toString(),
          delta: payload.delta,
          insights: Array.isArray(payload.insights)
            ? payload.insights.filter((i: unknown) => typeof i === 'string') : null,
          timestamp: formattedTime,
        });
      } else { localStorage.removeItem('sd_dashboard_last_session'); }
    } catch { localStorage.removeItem('sd_dashboard_last_session'); }
  }, []);

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf9' }}>
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const hasSession = !!latestData?.id;
  const displayScore = hasSession ? latestData!.score : (reduxScore ?? stats?.avg_score ?? '—');
  const displayReaction = hasSession ? `${latestData!.avg_reaction_time}s` : '—';
  const displayImprovement = stats ? `${stats.improvement_rate > 0 ? '+' : ''}${stats.improvement_rate}` : '—';
  const displayDriverType = hasSession ? latestData!.driver_type : (stats?.driver_type ?? 'Unknown');

  const statCards = [
    { label: 'Safety Score', value: displayScore, icon: Shield, color: '#059669', tint: '#f0fdf4', border: '#d1fae5' },
    { label: 'Avg Reaction', value: displayReaction, icon: Clock, color: '#3b82f6', tint: '#eff6ff', border: '#bfdbfe' },
    { label: 'Improvement', value: displayImprovement, icon: TrendingUp, color: '#d97706', tint: '#fffbeb', border: '#fde68a' },
    { label: 'Driver Type', value: displayDriverType, icon: Car, color: '#8b5cf6', tint: '#f5f3ff', border: '#ddd6fe' },
  ];

  const scenarios = [
    { icon: Phone, name: 'Phone Call', difficulty: 'Medium', color: '#f59e0b' },
    { icon: MessageCircle, name: 'WhatsApp', difficulty: 'Easy', color: '#10b981' },
    { icon: MapPin, name: 'GPS Alert', difficulty: 'Hard', color: '#ef4444' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your distracted driving training progress." />
      </Head>

      <AppShell>
        {/* ── Page header ───────────────────────────────────────────────── */}
        <FadeUp className="mb-7">
          <p className={LABEL + ' mb-1'}>Dashboard</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back,{' '}
            <span className="text-emerald-600">{user.name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s your training performance overview.</p>
        </FadeUp>

        {/* ── Stat row ─────────────────────────────────────────────────── */}
        <FadeUp delay={0.05} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`${CARD} p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform duration-200 cursor-default`}
            >
              <div className="flex items-center justify-between">
                <p className={LABEL}>{s.label}</p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.tint, border: `1px solid ${s.border}` }}
                >
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              {isLoading && s.value === '—' ? (
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
              )}
            </div>
          ))}
        </FadeUp>

        {/* ── Body grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left (span 2) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Start Simulation */}
            <FadeUp delay={0.1}>
              <div className={`${CARD} p-6`}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full mb-3"
                      style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                    >
                      <Activity className="w-3 h-3" />
                      Week 1 · Foundation
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">Driving Simulation</h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Face real-world distraction scenarios and train your decision-making.
                    </p>
                  </div>
                  <Link
                    href="/simulation"
                    id="start-simulation-btn"
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: '#059669', boxShadow: '0 2px 12px rgba(5,150,105,0.3)' }}
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start Session
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-5 border-t border-gray-100">
                  {scenarios.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}
                      >
                        <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.difficulty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Last Session */}
            {localSessionData.percentile !== null && (
              <FadeUp delay={0.15}>
                <div className={`${CARD} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900">Your Last Session</h2>
                    {localSessionData.timestamp && (
                      <span className="text-xs text-gray-400">{localSessionData.timestamp}</span>
                    )}
                  </div>
                  <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
                    <div className="flex gap-8 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className={LABEL + ' mb-1'}>Global Ranking</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-emerald-600">{localSessionData.percentile}%</span>
                          {localSessionData.delta && localSessionData.delta.status !== 'baseline' && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              localSessionData.delta.status === 'improvement' ? 'bg-green-100 text-green-700' :
                              localSessionData.delta.status === 'decline' ? 'bg-red-100 text-red-700' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {localSessionData.delta.val > 0 ? '+' : ''}{localSessionData.delta.val}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className={LABEL + ' mb-1'}>Personal Best</p>
                        <p className="text-xl font-bold text-gray-700">{localSessionData.best}% 🏆</p>
                      </div>
                    </div>
                    {localSessionData.insights && localSessionData.insights.length > 0 && (
                      <ul className="space-y-1.5">
                        {localSessionData.insights.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            {ins}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </FadeUp>
            )}

            {/* AI Feedback */}
            <FadeUp delay={0.2}>
              <div className={`${CARD} p-6`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 border border-emerald-100">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">AI Feedback</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4">
                  {isLoading ? 'Analyzing your driving behavior…' :
                    (stats?.ai_feedback || 'Complete a session to receive personalized AI driver coaching.')}
                </p>
              </div>
            </FadeUp>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Driver Profile */}
            <FadeUp delay={0.15}>
              <div className={`${CARD} p-5`}>
                <p className={LABEL + ' mb-3'}>Driver Profile</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 border border-violet-100">
                    <Car className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {user.profile_type === 'unknown' ? 'Not assessed' : user.profile_type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.profile_type === 'unknown' ? 'Complete a session' : 'Behavioral profile'}
                    </p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Quick Actions */}
            <FadeUp delay={0.2}>
              <div className={`${CARD} p-5`}>
                <p className={LABEL + ' mb-2'}>Quick Actions</p>
                <div className="space-y-0.5">
                  {[
                    { label: 'Behavioral Dossier', icon: Shield, href: '/dashboard/report' },
                    { label: 'View Progress', icon: TrendingUp, href: '/dashboard/progress' },
                    { label: 'Learning Center', icon: Activity, href: '/lessons' },
                  ].map((a) => (
                    <Link key={a.label} href={a.href}>
                      <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer group">
                        <a.icon className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 flex-1 transition-colors">{a.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recommended Lessons */}
            <FadeUp delay={0.25}>
              <div className={`${CARD} p-5`}>
                <p className={LABEL + ' mb-3'}>Recommended Lessons</p>
                <div className="space-y-2.5">
                  {lessons.length === 0 && !isLoading && (
                    <p className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3">
                      No recommendations yet.
                    </p>
                  )}
                  {isLoading && (
                    <>
                      <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                      <div className="h-16 rounded-xl bg-gray-100 animate-pulse opacity-60" />
                    </>
                  )}
                  {lessons.slice(0, 2).map((lesson) => (
                    <div key={lesson.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-all duration-150 cursor-pointer group">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors leading-snug">{lesson.title}</h4>
                        <span className="text-[10px] uppercase font-bold text-gray-400 px-1.5 py-0.5 rounded-md bg-white border border-gray-200 shrink-0">{lesson.difficulty}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{lesson.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recent Mistakes */}
            <FadeUp delay={0.3}>
              <div className={`${CARD} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-100">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                  </div>
                  <p className={LABEL}>Recent Mistakes</p>
                </div>
                <div className="space-y-2">
                  {isFetchingLatest ? (
                    <>
                      <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
                      <div className="h-11 rounded-xl bg-gray-100 animate-pulse opacity-60" />
                    </>
                  ) : !latestData || latestData.mistakes.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3">
                      No recent mistakes. Great work!
                    </p>
                  ) : (
                    latestData.mistakes.map((m, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl text-sm"
                        style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderLeft: '3px solid #fbbf24' }}
                      >
                        <p className="font-semibold text-gray-800 capitalize">{m.scenario.replace('_', ' ')}</p>
                        <p className={`text-xs mt-0.5 font-medium ${(m.response || '').includes('Unsafe') ? 'text-red-500' : 'text-amber-600'}`}>{m.response}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </AppShell>
    </>
  );
}
