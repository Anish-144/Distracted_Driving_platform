import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import { getLatestSession, LatestSessionData } from '@/api/sessions';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Shield,
  TrendingUp,
  Clock,
  Zap,
  PlayCircle,
  ChevronRight,
  Activity,
  Car,
  Phone,
  MessageCircle,
  MapPin,
  AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, lessons, isLoading } = useAppSelector((state) => state.progress);
  const { score: reduxScore } = useAppSelector((state) => state.session);

  const [latestData, setLatestData] = useState<LatestSessionData | null>(null);

  // Dashboard Cross-Session Tracker
  const [localSessionData, setLocalSessionData] = useState<{
    percentile: string | number | null;
    best: string | number | null;
    delta: { val: number; status: string } | null;
    insights: string[] | null;
    timestamp: string | null;
  }>({ percentile: null, best: null, delta: null, insights: null, timestamp: null });

  // Guard — redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      // Fetch Latest Session and Progress Data concurrently
      Promise.all([
        dispatch(fetchProgressData()).unwrap().catch(() => { }), // Ignore redux silent fail for dashboard
        getLatestSession()
      ])
        .then(([_, res]) => {
          setLatestData(res);
        })
        .catch((e) => {
          console.error("Failed to fetch latest session:", e);
          toast.error("Network issue: Failed to fetch recent dashboard data.");
        });
    }
  }, [isAuthenticated, router, dispatch]);

  // Safely grab cross-session persistence data (Percentiles & Insights)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const payloadStr = localStorage.getItem('sd_dashboard_last_session');
        const b = localStorage.getItem('best_user_percentile');

        if (payloadStr) {
          const payload = JSON.parse(payloadStr);

          // Verify v1 schema integrity before mounting payload
          if (payload &&
            payload.v === 1 &&
            payload.percentile !== undefined &&
            payload.delta &&
            typeof payload.delta.val === 'number' &&
            typeof payload.delta.status === 'string'
          ) {
            const formattedTime = payload.unix_timestamp
              ? new Date(payload.unix_timestamp).toLocaleString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                month: 'short',
                day: 'numeric',
                hour12: true
              })
              : null;

            setLocalSessionData({
              percentile: payload.percentile,
              best: b || payload.percentile.toString(),
              delta: payload.delta,
              insights: Array.isArray(payload.insights)
                ? payload.insights.filter((i: unknown) => typeof i === 'string')
                : null,
              timestamp: formattedTime
            });
          } else {
            // Corrupted or outdated schema detected
            localStorage.removeItem('sd_dashboard_last_session');
          }
        }
      } catch (err) {
        console.warn("Dashboard session persistence corrupted. Scrubbing cache.", err);
        localStorage.removeItem('sd_dashboard_last_session');
      }
    }
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Dynamic stats - Override with backend LatestSessionData or Redux Fallback where applicable
  const displayScore = latestData?.id ? latestData.score : (reduxScore ?? stats?.avg_score ?? '—');
  const displayReaction = latestData?.id ? `${latestData.avg_reaction_time}s` : '—';
  const displayDriverType = latestData?.id ? latestData.driver_type : (stats?.driver_type ?? 'Unknown');

  const statCards = [
    { label: 'Safety Score', value: displayScore, icon: Shield, color: 'text-brand-600', bgIcon: 'bg-brand-50 border-brand-100' },
    { label: 'Avg Reaction', value: displayReaction, icon: Clock, color: 'text-blue-600', bgIcon: 'bg-blue-50 border-blue-100' },
    { label: 'Improvement', value: stats ? `${stats.improvement_rate > 0 ? '+' : ''}${stats.improvement_rate} pts` : '—', icon: TrendingUp, color: 'text-accent-600', bgIcon: 'bg-accent-50 border-accent-100' },
    { label: 'Driver Type', value: displayDriverType, icon: Car, color: 'text-purple-600', bgIcon: 'bg-purple-50 border-purple-100' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your distracted driving training progress." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />

          <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Here is an overview of your recent training and driving performance.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</h3>
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${stat.bgIcon}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Start Simulation Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8 relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100 mb-4 shadow-sm">
                        <Activity className="w-3.5 h-3.5" />
                        Week 1 • Foundation
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Driving Simulation</h2>
                      <p className="text-gray-500 text-sm mt-1.5 max-w-md leading-relaxed">
                        Face real-world distraction scenarios and train your decision-making in a safe environment.
                      </p>
                    </div>
                    <Link
                      href="/simulation"
                      id="start-simulation-btn"
                      className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-md w-full sm:w-auto shadow-sm flex justify-center items-center gap-2 transition-colors duration-150 border border-transparent"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Session
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 pt-6 relative z-10">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Included Scenarios</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { icon: Phone, name: 'Phone Call', difficulty: 'Medium' },
                        { icon: MessageCircle, name: 'WhatsApp', difficulty: 'Easy' },
                        { icon: MapPin, name: 'GPS Alert', difficulty: 'Hard' },
                      ].map((s) => (
                        <div key={s.name} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                          <div className="bg-white w-8 h-8 rounded shrink-0 flex items-center justify-center border border-gray-200 text-brand-600 shadow-sm">
                            <s.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.difficulty} difficulty</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Your Last Session Persistence */}
                {localSessionData.percentile !== null && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 shrink-0 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-default group">
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 border border-gray-200 rounded-md group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
                          <Activity className="w-5 h-5 text-gray-600 group-hover:text-brand-600 transition-colors" />
                        </div>
                        Your Last Session
                      </div>
                      {localSessionData.timestamp && (
                        <span className="text-xs text-gray-400 font-medium">Logged: {localSessionData.timestamp}</span>
                      )}
                    </h2>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row gap-6 mb-5 pb-5 border-b border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Global Ranking</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{localSessionData.percentile}%</span>
                            {localSessionData.delta && localSessionData.delta.status !== 'baseline' && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${localSessionData.delta.status === 'improvement' ? 'bg-green-100 text-green-700' : localSessionData.delta.status === 'decline' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                {localSessionData.delta.val > 0 ? '+' : ''}{localSessionData.delta.val}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Personal Best</p>
                          <p className="text-2xl font-medium text-gray-700">{localSessionData.best || localSessionData.percentile}% 🏆</p>
                        </div>
                      </div>

                      {localSessionData.insights && localSessionData.insights.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Key Takeaways</p>
                          <ul className="space-y-3 list-none">
                            {localSessionData.insights.map((ins, idx) => (
                              <li key={idx} className="text-sm leading-relaxed flex items-start gap-2.5">
                                <span className="text-brand-600 mt-1 font-bold shrink-0">•</span>
                                <span className="font-medium text-gray-800">{ins}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md">
                      <Zap className="w-4 h-4 text-brand-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 tracking-tight">AI Feedback</h2>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {isLoading ? 'Analyzing your recent driving behavior...' : (stats?.ai_feedback || 'Complete a session to receive personalized AI driver coaching.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Side Column (Activity / Profile Panel) */}
              <div className="space-y-8">
                {/* Profile Type Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Driver Profile</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium capitalize block hidden sm:block">
                        {user.profile_type === 'unknown' ? 'Not assessed' : user.profile_type}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 block">
                        {user.profile_type === 'unknown'
                          ? 'Complete a session'
                          : 'Behavioral profile'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
                  <div className="space-y-0.5">
                    {[
                      { label: 'View Progress', icon: TrendingUp, href: '/dashboard/progress' },
                      { label: 'Learning Center', icon: Activity, href: '/lessons' },
                    ].map((action) => (
                      <Link key={action.label} href={action.href}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 hover:text-brand-600 transition-colors cursor-pointer group">
                          <action.icon className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition-colors" />
                          <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                            {action.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recommended Lessons */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recommended Lessons</h3>
                  <div className="space-y-3">
                    {lessons.length === 0 && !isLoading && (
                      <p className="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4">No recommendations found.</p>
                    )}
                    {lessons.slice(0, 2).map((lesson) => (
                      <div key={lesson.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-brand-700 transition-colors leading-snug">{lesson.title}</h4>
                            <span className="text-[10px] uppercase font-medium bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">{lesson.difficulty}</span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{lesson.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Mistakes Panel */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 bg-accent-50 border border-accent-100 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent-600" />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Mistakes</h3>
                  </div>
                  <div className="space-y-3">
                    {!latestData || latestData.mistakes.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-4">No recent mistakes logged. Great work!</p>
                    ) : (
                      latestData.mistakes.map((mistake, index) => (
                        <div key={index} className="flex flex-col gap-1 text-sm p-3 rounded-md bg-gray-50 border border-gray-200 border-l-4 border-l-accent-400">
                          <span className="text-gray-900 font-medium capitalize">{mistake.scenario.replace('_', ' ')}</span>
                          <span className={`text-xs ${(mistake.response || '').includes('Unsafe') ? 'text-red-600 font-medium' : 'text-accent-600 font-medium'}`}>{mistake.response}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
