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
import { motion } from 'framer-motion';
import {
  Shield, TrendingUp, Clock, Car, PlayCircle, ChevronRight,
  Activity, Phone, MessageCircle, MapPin, AlertTriangle, ArrowUpRight,
  Zap, Brain, BarChart2, BookOpen, FileText, Target, CheckCircle2,
} from 'lucide-react';

// ── Shared micro-components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="label-caps mb-3">
      {children}
    </p>
  );
}

function CardHeader({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  right,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-bold text-primary tracking-tight">{title}</h2>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
        if (!status || status >= 500) return;
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

  // ── No localStorage cache used (backend authoritative percentile now used) ──

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-shell">
        <div className="w-7 h-7 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const hasSession = !!latestData?.id;
  const displayScore = hasSession ? latestData!.score : (reduxScore ?? stats?.avg_score ?? '—');
  const displayReaction = hasSession ? `${latestData!.avg_reaction_time}s` : '—';
  const displayImprovement = stats ? `${stats.improvement_rate > 0 ? '+' : ''}${stats.improvement_rate}` : '—';
  const profileKnown = user.profile_type && user.profile_type !== 'unknown';
  const displayDriverType = hasSession 
    ? latestData!.driver_type 
    : (profileKnown ? user.profile_type!.replace('_', ' ') : (stats?.driver_type ?? 'Unknown'));
  const firstName = user.name?.split(' ')[0] || 'User';

  const statCards = [
    {
      label: 'Safety Score', value: displayScore, sub: 'session avg',
      icon: Shield, color: '#34d399', tint: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)',
    },
    {
      label: 'Reaction Time', value: displayReaction, sub: 'last session',
      icon: Clock, color: '#60a5fa', tint: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)',
    },
    {
      label: 'Improvement', value: displayImprovement, sub: 'overall trend',
      icon: TrendingUp, color: '#fbbf24', tint: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)',
    },
    {
      label: 'Driver Profile', value: displayDriverType, sub: 'behavioral type',
      icon: Brain, color: '#a78bfa', tint: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)',
    },
  ];

  const scenarios = [
    { icon: Phone,         name: 'Phone Call',   difficulty: 'Medium', color: '#f59e0b' },
    { icon: MessageCircle, name: 'WhatsApp',      difficulty: 'Easy',   color: '#10b981' },
    { icon: MapPin,        name: 'GPS Alert',     difficulty: 'Hard',   color: '#ef4444' },
  ];

  const quickActions = [
    { label: 'Behavioral Dossier',  icon: FileText,   href: '/dashboard/report',    desc: 'Full profile breakdown' },
    { label: 'Training Progress',   icon: BarChart2,  href: '/dashboard/progress',  desc: 'Session history' },
    { label: 'Learning Center',     icon: BookOpen,   href: '/lessons',             desc: 'Adaptive lessons' },
    { label: 'Research Analytics',  icon: Target,     href: '/dashboard/research',  desc: 'Behavioral data' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your distracted driving training progress and behavioral intelligence." />
      </Head>

      <AppShell maxWidth="wide">

        {/* ── Welcome header ─────────────────────────────────────────────── */}
        <FadeUp className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps mb-1">
                Behavioral Intelligence Platform
              </p>
              <h1 className="text-xl font-bold text-primary tracking-tight">
                Welcome back, <span className="text-accent">{firstName}</span>
              </h1>
              <p className="text-sm text-muted mt-0.5">
                {profileKnown
                  ? `Profile: ${user.profile_type?.replace('_', ' ')} · Training active`
                  : 'Complete a calibration session to unlock your behavioral profile.'}
              </p>
            </div>
            {/* Primary CTA — anchored top right on welcome */}
            <Link
              href="/simulation"
              id="start-simulation-btn"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-primary bg-primary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: '#F4F4F5', color: '#09090B' }}
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Start Session</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </FadeUp>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <FadeUp delay={0.05} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              className="bg-secondary rounded-xl border border-subtle p-4 flex flex-col gap-2 cursor-default"
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{s.label}</p>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.tint, border: `1px solid ${s.border}` }}
                >
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
              </div>
              {isLoading && s.value === '—' ? (
                <div className="h-6 w-16 rounded-md bg-secondary animate-pulse" />
              ) : (
                <p className="text-xl font-bold tracking-tight capitalize mono-data" style={{ color: s.color }}>
                  {s.value}
                </p>
              )}
              <p className="text-[10px] text-muted font-medium">{s.sub}</p>
            </motion.div>
          ))}
        </FadeUp>

        {/* ── Body grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left column (2/3) ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Simulation readiness card */}
            <FadeUp delay={0.08}>
              <div className="bg-primary rounded-xl border border-subtle overflow-hidden">
                {/* Colored accent strip */}
                <div className="h-0.5 w-full bg-primary" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}
                    >
                      <Car className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-bold text-primary">Driving Simulation</h2>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
                        >
                          <Activity className="w-2.5 h-2.5" />
                          Week 1
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Face real-world distraction scenarios — phone calls, messages, navigation alerts — and train your split-second decision-making.
                      </p>
                    </div>
                  </div>

                  {/* Scenario chips */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-subtle">
                    {scenarios.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-subtle bg-secondary"
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}
                        >
                          <s.icon className="w-3 h-3" style={{ color: s.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-primary leading-none truncate">{s.name}</p>
                          <p className="text-[10px] text-muted mt-0.5">{s.difficulty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Last Session Intelligence — always shown, conditionally filled */}
            <FadeUp delay={0.13}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <CardHeader
                  icon={BarChart2}
                  iconColor="#60a5fa"
                  iconBg="rgba(96,165,250,0.1)"
                  title="Last Session Intelligence"
                  right={
                    localSessionData.timestamp && (
                      <span className="text-[10px] text-muted font-medium">{localSessionData.timestamp}</span>
                    )
                  }
                />

                {stats?.percentile !== undefined ? (
                  <div className="space-y-4">
                    {/* Metric row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary border border-subtle">
                        <p className="label-caps mb-1.5">Population Rank</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold mono-data text-primary">
                            {stats.percentile}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted mt-1">global percentile</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary border border-subtle">
                        <p className="label-caps mb-1.5">Personal Avg</p>
                        <p className="text-2xl font-bold mono-data text-primary">{stats.avg_score}%</p>
                        <p className="text-[10px] text-muted mt-1">safety score</p>
                      </div>
                    </div>

                    {/* Insights */}
                    {localSessionData.insights && localSessionData.insights.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Session Insights</p>
                        {localSessionData.insights.map((ins, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-secondary">
                            <CheckCircle2 className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                            {ins}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-secondary border border-subtle p-4 text-center">
                    <Activity className="w-5 h-5 text-muted mx-auto mb-2" />
                    <p className="text-xs text-muted">No session data yet.</p>
                    <p className="text-[11px] text-muted mt-0.5">Complete your first simulation to see intelligence here.</p>
                  </div>
                )}
              </div>
            </FadeUp>

            {/* AI Coaching Feedback */}
            <FadeUp delay={0.18}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <CardHeader
                  icon={Zap}
                  iconColor="#a78bfa"
                  iconBg="rgba(167,139,250,0.1)"
                  title="AI Coaching Feedback"
                />
                <div className="rounded-lg bg-secondary border border-subtle p-4">
                  <p className="text-sm text-secondary leading-relaxed">
                    {isLoading
                      ? 'Analyzing your driving behavior…'
                      : (stats?.ai_feedback || 'Complete a session to receive personalized AI driver coaching based on your behavioral profile.')}
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* ── Right column (1/3) ── */}
          <div className="flex flex-col gap-4">

            {/* Behavioral Profile card */}
            <FadeUp delay={0.1}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <SectionLabel>Behavioral Profile</SectionLabel>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-subtle">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
                  >
                    <Brain className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary capitalize truncate">
                      {profileKnown ? user.profile_type?.replace('_', ' ') : 'Not Assessed'}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {profileKnown ? 'Behavioral profile active' : 'Complete a calibration session'}
                    </p>
                  </div>
                </div>
                {!profileKnown && (
                  <Link
                    href="/onboarding"
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold text-primary border border-subtle bg-secondary hover:bg-tertiary transition-colors duration-150"
                  >
                    <Zap className="w-3 h-3" />
                    Start Calibration
                  </Link>
                )}
              </div>
            </FadeUp>

            {/* Learning Metrics */}
            <FadeUp delay={0.12}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <SectionLabel>Learning Metrics</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-secondary border border-subtle text-center">
                    <p className="text-lg font-bold text-primary mono-data">{stats?.lessons_completed ?? 0}</p>
                    <p className="text-[10px] text-muted font-medium mt-0.5">Completed</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary border border-subtle text-center">
                    <p className="text-lg font-bold text-brand-500 mono-data">{stats?.lesson_streak ?? 0}</p>
                    <p className="text-[10px] text-muted font-medium mt-0.5">Day Streak</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary border border-subtle text-center">
                    <p className="text-lg font-bold text-accent mono-data">{stats?.lesson_completion_rate ?? 0}%</p>
                    <p className="text-[10px] text-muted font-medium mt-0.5">Win Rate</p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Quick Actions */}

            <FadeUp delay={0.15}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <SectionLabel>Quick Navigation</SectionLabel>
                <div className="space-y-0.5">
                  {quickActions.map((a) => (
                    <Link key={a.label} href={a.href}>
                      <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-secondary transition-colors duration-150 group cursor-pointer">
                        <a.icon className="w-3.5 h-3.5 text-muted group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-secondary group-hover:text-primary transition-colors leading-none">{a.label}</p>
                          <p className="text-[10px] text-muted mt-0.5">{a.desc}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted group-hover:text-brand-500 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recommended Lessons */}
            <FadeUp delay={0.2}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Recommended Lessons</SectionLabel>
                  <Link href="/lessons" className="text-[10px] font-semibold text-accent hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-2">
                  {lessons.length === 0 && !isLoading && (
                    <div className="rounded-lg bg-secondary border border-subtle p-3 text-center">
                      <p className="text-xs text-muted">No recommendations yet. Complete a session first.</p>
                    </div>
                  )}
                  {isLoading && (
                    <>
                      <div className="h-14 rounded-lg bg-secondary animate-pulse" />
                      <div className="h-14 rounded-lg bg-secondary animate-pulse opacity-60" />
                    </>
                  )}
                  {lessons.slice(0, 2).map((lesson) => (
                    <Link key={lesson.id} href="/lessons">
                      <div className="p-3 rounded-lg border border-subtle bg-secondary hover:border-brand-500/40 hover:bg-tertiary transition-all duration-150 cursor-pointer group">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-xs font-semibold text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug truncate">
                            {lesson.title}
                          </h4>
                          <span className="text-[9px] uppercase font-bold text-muted px-1.5 py-0.5 rounded bg-tertiary border border-subtle shrink-0">
                            {lesson.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">{lesson.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recent Mistakes */}
            <FadeUp delay={0.25}>
              <div className="bg-primary rounded-xl border border-card p-5">
                <CardHeader
                  icon={AlertTriangle}
                  iconColor="#fbbf24"
                  iconBg="rgba(251,191,36,0.1)"
                  title="Recent Mistakes"
                />
                <div className="space-y-2">
                  {isFetchingLatest ? (
                    <>
                      <div className="h-10 rounded-lg bg-secondary animate-pulse" />
                      <div className="h-10 rounded-lg bg-secondary animate-pulse opacity-60" />
                    </>
                  ) : !latestData || latestData.mistakes.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-subtle">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      <p className="text-xs text-secondary">No recent mistakes. Keep it up!</p>
                    </div>
                  ) : (
                    latestData.mistakes.map((m, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg text-xs"
                        style={{
                          background: 'rgba(251,191,36,0.04)',
                          border: '1px solid rgba(251,191,36,0.15)',
                          borderLeft: '2px solid #fbbf24',
                        }}
                      >
                        <p className="font-semibold text-primary capitalize">{m.scenario.replace('_', ' ')}</p>
                        <p className={`mt-0.5 font-medium ${(m.response || '').includes('Unsafe') ? 'text-destructive' : 'text-warning'}`}>
                          {m.response}
                        </p>
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
