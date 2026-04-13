import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import { fetchProgressData } from '@/store/progressSlice';
import { getLatestSession, LatestSessionData } from '@/api/sessions';
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
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, lessons, isLoading } = useAppSelector((state) => state.progress);
  const { score: reduxScore } = useAppSelector((state) => state.session);

  const [latestData, setLatestData] = useState<LatestSessionData | null>(null);

  // Guard — redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      dispatch(fetchProgressData());

      // Fetch Latest Session specifically
      getLatestSession().then((res) => {
        setLatestData(res);
      }).catch((e) => {
        console.error("Failed to fetch latest session:", e);
      });
    }
  }, [isAuthenticated, router, dispatch]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Dynamic stats - Override with backend LatestSessionData or Redux Fallback where applicable
  const displayScore = latestData?.id ? latestData.score : (reduxScore ?? stats?.avg_score ?? '—');
  const displayReaction = latestData?.id ? `${latestData.avg_reaction_time}s` : '—';
  const displayDriverType = latestData?.id ? latestData.driver_type : (stats?.driver_type ?? 'Unknown');

  const statCards = [
    { label: 'Safety Score', value: displayScore, icon: Shield, color: 'text-brand-400', bg: 'bg-brand-900/30' },
    { label: 'Avg Reaction', value: displayReaction, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: 'Improvement', value: stats ? `${stats.improvement_rate > 0 ? '+' : ''}${stats.improvement_rate} pts` : '—', icon: TrendingUp, color: 'text-accent-400', bg: 'bg-accent-900/30' },
    { label: 'Driver Type', value: displayDriverType, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-900/30' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your distracted driving training progress." />
      </Head>

      <div className="min-h-screen bg-surface-900 flex">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-1 p-6 lg:p-8">
            {/* Welcome Header */}
            <div className="mb-8 animate-fade-in">
              <h1 className="text-3xl font-bold text-white">
                Welcome back, <span className="text-brand-400">{user.name.split(' ')[0]}</span>! 👋
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Ready to strengthen your safe driving habits today?
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
              {statCards.map((stat) => (
                <div key={stat.label} className="card flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main CTA — Start Simulation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Start Simulation Card */}
              <div className="lg:col-span-2">
                <div className="card border-brand-800/50 bg-gradient-to-br from-surface-700 to-surface-800 relative overflow-hidden">
                  {/* Glow */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand-600/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="badge-success mb-2 inline-flex">Week 1 • Foundation</span>
                        <h2 className="text-xl font-bold text-white">Start Driving Simulation</h2>
                        <p className="text-gray-400 text-sm mt-1">
                          Face real-world distraction scenarios and train your decision-making.
                        </p>
                      </div>
                    </div>

                    {/* Scenarios preview */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { icon: '📱', name: 'Phone Call', difficulty: 'Medium' },
                        { icon: '💬', name: 'WhatsApp', difficulty: 'Easy' },
                        { icon: '🗺️', name: 'GPS Alert', difficulty: 'Hard' },
                      ].map((s) => (
                        <div key={s.name} className="bg-surface-600/50 rounded-lg p-3 text-center">
                          <div className="text-2xl mb-1">{s.icon}</div>
                          <div className="text-xs font-medium text-gray-300">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.difficulty}</div>
                        </div>
                      ))}
                    </div>

                    <Link href="/simulation" id="start-simulation-btn">
                      <button className="btn-primary flex items-center gap-2 w-full justify-center">
                        <PlayCircle className="w-5 h-5" />
                        Start Simulation Session
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Activity / Profile Panel */}
              <div className="space-y-4">
                {/* Profile Type Card */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Driver Profile</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-xl">
                      🚗
                    </div>
                    <div>
                      <p className="text-white font-medium capitalize">
                        {user.profile_type === 'unknown' ? 'Not assessed yet' : user.profile_type}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {user.profile_type === 'unknown'
                          ? 'Complete a session to get your profile'
                          : 'Behavioral profile'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'View Progress', icon: TrendingUp, href: '/dashboard/progress' },
                      { label: 'My Sessions', icon: Activity, href: '/dashboard/sessions' },
                    ].map((action) => (
                      <Link key={action.label} href={action.href}>
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer group">
                          <action.icon className="w-4 h-4 text-gray-400 group-hover:text-brand-400 transition-colors" />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                            {action.label}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Mistakes Panel */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Mistakes</h3>
                  <div className="space-y-3">
                    {!latestData || latestData.mistakes.length === 0 ? (
                      <p className="text-xs text-gray-500">No recent mistakes logged. Great driving!</p>
                    ) : (
                      latestData.mistakes.map((mistake, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2 rounded bg-surface-600/50">
                          <span className="text-gray-300 font-medium capitalize">{mistake.scenario.replace('_', ' ')}</span>
                          <span className={`${mistake.response.includes('Unsafe') ? 'text-red-400' : 'text-orange-400'}`}>{mistake.response}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic AI Feedback and Lessons */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {/* AI Feedback Card */}
              <div className="card glass relative overflow-hidden border-brand-800/50">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-accent-400" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">🤖</div>
                  <h2 className="text-lg font-bold text-white">AI Feedback</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {isLoading ? 'Analyzing your recent driving behavior...' : (stats?.ai_feedback || 'Complete a session to receive personalized AI driver coaching.')}
                </p>
              </div>

              {/* Recommended Lessons */}
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4">Recommended For You</h2>
                <div className="space-y-3">
                  {lessons.length === 0 && !isLoading && (
                     <p className="text-gray-400 text-sm">No lessons recommended right now.</p>
                  )}
                  {lessons.slice(0, 2).map((lesson) => (
                    <div key={lesson.id} className="bg-surface-600/50 rounded-lg p-3 flex items-center justify-between group cursor-pointer hover:bg-surface-600 transition-colors border border-transparent hover:border-brand-800/30">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-200">{lesson.title}</h4>
                          <span className="text-[10px] uppercase font-bold bg-brand-900/40 text-brand-400 px-2 py-0.5 rounded-full">{lesson.difficulty}</span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1">{lesson.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
