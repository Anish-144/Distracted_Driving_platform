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
  Activity, Phone, MessageCircle, MapPin, AlertTriangle,
  Zap, Brain, BarChart2, BookOpen, FileText, Target, CheckCircle2,
  ArrowRight, ArrowUp, ArrowDown, Wifi, Users, CloudRain, TrendingDown
} from 'lucide-react';

// ── Shared primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, isLoading, accent, trend }: {
  label: string;
  value: any;
  sub: string;
  icon: React.ElementType;
  isLoading: boolean;
  accent?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div
      className="p-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: accent ? '#C8FF00' : 'var(--bg-card)',
        border: `1px solid ${accent ? '#C8FF00' : 'var(--border-card)'}`,
        borderRadius: '8px',
      }}
    >
      {/* Subtle gradient shimmer on accent */}
      {accent && (
        <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)' }} />
      )}
      <div className="flex items-center justify-between relative z-10">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.10em]"
          style={{ color: accent ? '#1A1814' : 'var(--text-muted)' }}
        >
          {label}
        </p>
        <div className="flex items-center gap-1">
          {trend && trend !== 'neutral' && (
            <span style={{ color: accent ? '#1A1814' : (trend === 'up' ? '#10b981' : '#ef4444') }}>
              {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            </span>
          )}
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: accent ? '#1A1814' : 'var(--text-muted)' }}
          />
        </div>
      </div>
      {isLoading && value === '—' ? (
        <div className="h-6 w-16 skeleton rounded relative z-10" />
      ) : (
        <p
          className="text-2xl font-bold mono-data capitalize relative z-10"
          style={{
            color: accent ? '#1A1814' : 'var(--text-primary)',
            letterSpacing: '-0.03em',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          {value}
        </p>
      )}
      <p className="text-[10px] font-medium relative z-10" style={{ color: accent ? '#1A1814bb' : 'var(--text-muted)' }}>{sub}</p>
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
      })
      .finally(() => { if (!controller.signal.aborted) setIsFetchingLatest(false); });
    return () => { controller.abort(); setIsFetchingLatest(false); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    dispatch(fetchProgressData()).unwrap().catch(() => {});
  }, [isAuthenticated, router, dispatch]);

  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="w-5 h-5 border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
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
    : (profileKnown ? user.profile_type!.replace('_', ' ') : (stats?.driver_type ?? '—'));
  const firstName = user.name?.split(' ')[0] || 'User';

  const statCards = [
    { label: 'Safety Score', value: displayScore, sub: 'session avg', icon: Shield, accent: true, trend: 'up' as const },
    { label: 'Reaction Time', value: displayReaction, sub: 'last session', icon: Clock, trend: 'neutral' as const },
    { label: 'Improvement', value: displayImprovement, sub: 'overall trend', icon: TrendingUp, trend: displayImprovement !== '—' && displayImprovement.startsWith('+') ? 'up' as const : 'down' as const },
    { label: 'Driver Profile', value: displayDriverType, sub: 'behavioral type', icon: Brain, trend: 'neutral' as const },
  ];

  const scenarios = [
    { icon: Phone,         name: 'Phone Call',       difficulty: 'High' },
    { icon: MessageCircle, name: 'WhatsApp',          difficulty: 'Medium' },
    { icon: MapPin,        name: 'GPS Alert',         difficulty: 'Hard' },
    { icon: Wifi,          name: 'Social Media',      difficulty: 'Easy' },
    { icon: Users,         name: 'Passenger Noise',   difficulty: 'Medium' },
    { icon: CloudRain,     name: 'Weather Change',    difficulty: 'Hard' },
  ];

  const quickActions = [
    { label: 'Behavioral Report', icon: FileText,  href: '/dashboard/report',   desc: 'Full profile breakdown' },
    { label: 'Session History',   icon: BarChart2, href: '/dashboard/progress', desc: 'Training history' },
    { label: 'Lessons',           icon: BookOpen,  href: '/lessons',            desc: 'Adaptive curriculum' },
    { label: 'Research Data',     icon: Target,    href: '/dashboard/research', desc: 'Behavioral analytics' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your driving behavior training and progress." />
      </Head>

      <AppShell>

        {/* ── Welcome bar ────────────────────────────────────────────── */}
        <FadeUp className="mb-6">
          <div
            className="flex items-center justify-between py-4 px-5"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '4px',
            }}
          >
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Behavioral Training
              </p>
              <h1
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Hello, {firstName}.
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {profileKnown
                  ? `Profile: ${user.profile_type?.replace('_', ' ')} · Training active`
                  : 'Complete a calibration session to get started.'}
              </p>
            </div>
            <Link
              href="/simulation"
              id="start-simulation-btn"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all duration-150 flex-shrink-0 group"
              style={{
                background: '#1A1814',
                color: '#C8FF00',
                borderRadius: '4px',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2D2A24')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1A1814')}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              START SESSION
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </FadeUp>

        {/* ── KPI row ────────────────────────────────────────────────── */}
        <FadeUp delay={0.04} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((s, i) => (
            <StatCard key={i} {...s} isLoading={isLoading} />
          ))}
        </FadeUp>

        {/* ── Body grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left column (2/3) ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Simulation Card */}
            <FadeUp delay={0.08}>
              <div
                className="overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}
              >
                {/* Chartreuse top bar */}
                <div className="h-1 w-full" style={{ background: '#C8FF00' }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <SectionLabel>Driving Simulation</SectionLabel>
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 mb-3"
                          style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-muted)', borderRadius: '3px' }}
                        >
                          <Activity className="w-2.5 h-2.5" />
                          Week 1
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Face real-world distraction scenarios — phone calls, navigation alerts, messages — and build split-second decision making.
                      </p>
                    </div>
                  </div>

                  {/* Scenario chips — expanded to 6 types */}
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    {scenarios.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-2 p-2.5 transition-all duration-150 hover:-translate-y-0.5"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                      >
                        <s.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold leading-none truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.difficulty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* CTA */}
                  <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <Link
                      href="/simulation"
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
                      style={{ color: '#C8FF00' }}
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Start Full Simulation →
                    </Link>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Session Intelligence */}
            <FadeUp delay={0.12}>
              <div className="p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>Last Session Intelligence</SectionLabel>
                {stats?.percentile !== undefined ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Population Rank', value: `${stats.percentile}%`, sub: 'global percentile' },
                        { label: 'Personal Avg', value: `${stats.avg_score}%`, sub: 'safety score' },
                      ].map((m) => (
                        <div key={m.label} className="p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                          <p className="text-2xl font-bold mono-data" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{m.value}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{m.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                    <Activity className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No session data yet.</p>
                  </div>
                )}
              </div>
            </FadeUp>

            {/* AI Coaching Feedback */}
            <FadeUp delay={0.16}>
              <div className="p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>AI Coaching Feedback</SectionLabel>
                <div className="p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', borderLeft: '3px solid #C8FF00' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {isLoading
                      ? 'Analyzing your driving behavior…'
                      : (stats?.ai_feedback || 'Complete a session to receive personalized coaching based on your behavioral profile.')}
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* ── Right column (1/3) ── */}
          <div className="flex flex-col gap-4">

            {/* Behavioral Profile */}
            <FadeUp delay={0.09}>
              <div className="p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>Behavioral Profile</SectionLabel>
                <div
                  className="flex items-center gap-3 p-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                    style={{ background: '#C8FF00', borderRadius: '4px' }}
                  >
                    <Brain className="w-4 h-4" style={{ color: '#1A1814' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                      {profileKnown ? user.profile_type?.replace('_', ' ') : 'Not Assessed'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {profileKnown ? 'Profile active' : 'Run a calibration session'}
                    </p>
                  </div>
                </div>
                {!profileKnown && (
                  <Link
                    href="/onboarding"
                    className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold transition-colors duration-100"
                    style={{
                      background: '#1A1814',
                      color: '#C8FF00',
                      borderRadius: '4px',
                      marginTop: '8px',
                    }}
                  >
                    START CALIBRATION →
                  </Link>
                )}
              </div>
            </FadeUp>

            {/* Learning Metrics */}
            <FadeUp delay={0.11}>
              <div className="p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>Learning Metrics</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: stats?.lessons_completed ?? 0, label: 'Done' },
                    { value: stats?.lesson_streak ?? 0,     label: 'Streak' },
                    { value: `${stats?.lesson_completion_rate ?? 0}%`, label: 'Rate' },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="p-2.5 text-center"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                    >
                      <p className="text-lg font-bold mono-data" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{m.value}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Quick Navigation */}
            <FadeUp delay={0.14}>
              <div className="p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>Quick Navigation</SectionLabel>
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  {quickActions.map((a) => (
                    <Link key={a.label} href={a.href}>
                      <div
                        className="flex items-center gap-3 py-2.5 border-b transition-colors duration-100 cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recommended Lessons */}
            <FadeUp delay={0.17}>
              <div className="p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Lessons</SectionLabel>
                  <Link href="/lessons" className="text-[10px] font-semibold uppercase tracking-wide hover:underline" style={{ color: 'var(--text-muted)' }}>
                    View all →
                  </Link>
                </div>
                <div className="space-y-2">
                  {isLoading && (
                    <><div className="h-12 skeleton" /><div className="h-12 skeleton opacity-60" /></>
                  )}
                  {!isLoading && lessons.length === 0 && (
                    <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>Complete a session to unlock lessons.</p>
                  )}
                  {lessons.slice(0, 2).map((lesson) => (
                    <Link key={lesson.id} href="/lessons">
                      <div
                        className="p-3 border transition-colors duration-100 cursor-pointer"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '4px' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lesson.title}</h4>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 shrink-0" style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-muted)', borderRadius: '3px' }}>
                            {lesson.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{lesson.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Recent Mistakes */}
            <FadeUp delay={0.2}>
              <div className="p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                <SectionLabel>Recent Mistakes</SectionLabel>
                {isFetchingLatest ? (
                  <><div className="h-10 skeleton mb-2" /><div className="h-10 skeleton opacity-60" /></>
                ) : !latestData || latestData.mistakes.length === 0 ? (
                  <div className="flex items-center gap-2 p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3D6B3D' }} />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No recent mistakes. Keep it up!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestData.mistakes.map((m, i) => (
                      <div
                        key={i}
                        className="p-3 text-xs"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-card)',
                          borderLeft: '3px solid var(--text-warning)',
                          borderRadius: '4px',
                        }}
                      >
                        <p className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{m.scenario.replace('_', ' ')}</p>
                        <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.response}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FadeUp>
          </div>
        </div>
      </AppShell>
    </>
  );
}
