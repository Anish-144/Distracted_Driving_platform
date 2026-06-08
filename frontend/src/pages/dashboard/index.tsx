import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import { fetchGamificationData, performDailyCheckin, fetchFriends, fetchXPLeaderboard } from '@/store/gamificationSlice';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { motion, AnimatePresence } from 'framer-motion';
import { sendFriendRequest, acceptFriendRequest, challengeFriend } from '@/api/gamification';
import {
  PlayCircle, ChevronRight, Zap, Trophy, Users, BarChart2,
  BookOpen, FileText, Target, CheckCircle2, Plus, X, Swords,
} from 'lucide-react';

import XPBar from '@/components/gamification/XPBar';
import StreakWidget from '@/components/gamification/StreakWidget';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import DailyChallenge from '@/components/gamification/DailyChallenge';
import LevelUpToast, { playSound } from '@/components/gamification/LevelUpToast';

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const diff = value;
    if (diff === 0) return;
    const step = Math.ceil(diff / 30);
    const id = setInterval(() => {
      start = Math.min(start + step, diff);
      setDisplay(start);
      if (start >= diff) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank, level }: { rank: string; level: number }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))',
        border: '1px solid rgba(139,92,246,0.35)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg font-black text-xs"
        style={{
          width: 22, height: 22,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontSize: 10,
        }}
      >
        {level}
      </div>
      <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>{rank}</span>
    </div>
  );
}

// ─── Friend request modal ─────────────────────────────────────────────────────
function AddFriendModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await sendFriendRequest(email.trim());
      toast.success(res.message);
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        initial={{ y: 60, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.96 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Add a Friend</h3>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>
        <input
          type="email"
          placeholder="friend@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full rounded-xl px-4 py-2.5 text-sm mb-3 outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: 'var(--color-text-primary)',
          }}
          autoFocus
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Sending…' : 'Send Request ⚡'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector(s => s.auth);
  const { stats, isLoading: progressLoading } = useAppSelector(s => s.progress);
  const {
    data: gData, friends, leaderboard, currentUserRank, isLoading: gLoading,
    newlyUnlockedKeys,
  } = useAppSelector(s => s.gamification);

  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'leaderboard'>('home');
  const [showAddFriend, setShowAddFriend] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Load data
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    dispatch(fetchProgressData()).unwrap().catch(() => {});
    dispatch(fetchGamificationData()).unwrap().catch(() => {});
    dispatch(performDailyCheckin()).unwrap().catch(() => {});
  }, [isAuthenticated, dispatch, router]);

  // Load friends / leaderboard on tab switch
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'friends') dispatch(fetchFriends());
    if (activeTab === 'leaderboard') dispatch(fetchXPLeaderboard());
  }, [activeTab, isAuthenticated, dispatch]);

  // Play achievement sound when new ones unlock
  useEffect(() => {
    if (newlyUnlockedKeys.length > 0) {
      playSound('achievement');
      newlyUnlockedKeys.forEach(key => {
        const ach = gData?.achievements.find(a => a.key === key);
        if (ach) toast.success(`🏆 Achievement unlocked: ${ach.title} (+${ach.xp_reward} XP)`, { duration: 4000 });
      });
    }
  }, [newlyUnlockedKeys, gData]);

  const reloadFriends = useCallback(() => dispatch(fetchFriends()), [dispatch]);

  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-app)' }}>
        <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const firstName = user.name?.split(' ')[0] || 'Driver';
  const isLoadingAny = progressLoading || gLoading;
  const unlockedAchs = gData?.achievements.filter(a => a.unlocked) ?? [];
  const lockedAchs = gData?.achievements.filter(a => !a.unlocked) ?? [];
  const pendingRequests = friends.filter(f => !f.is_requester && f.status === 'pending');
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const sentPending = friends.filter(f => f.is_requester && f.status === 'pending');

  const quickActions = [
    { label: 'Behavioral Report', icon: FileText, href: '/dashboard/report', desc: 'Your cognitive dossier' },
    { label: 'Progress History', icon: BarChart2, href: '/dashboard/progress', desc: 'Session timeline' },
    { label: 'Learning Center', icon: BookOpen, href: '/lessons', desc: 'Adaptive lessons' },
    { label: 'Research Data', icon: Target, href: '/dashboard/research', desc: 'Behavioral analytics' },
  ];

  // Tab bar items
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: '🏠' },
    { id: 'friends' as const, label: 'Friends', icon: '👥', badge: pendingRequests.length },
    { id: 'leaderboard' as const, label: 'Ranks', icon: '🏆' },
  ];

  return (
    <>
      <Head>
        <title>SafeDrive AI — Dashboard</title>
        <meta name="description" content="Your gamified SafeDrive AI dashboard. Track XP, streaks, and achievements." />
      </Head>

      {/* Level-up overlay */}
      <LevelUpToast />

      {/* Add friend modal */}
      <AnimatePresence>
        {showAddFriend && (
          <AddFriendModal
            onClose={() => setShowAddFriend(false)}
            onAdded={reloadFriends}
          />
        )}
      </AnimatePresence>

      <AppShell>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                SafeDrive AI
              </p>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                Hey, <span style={{
                  background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>{firstName}</span> 👋
              </h1>
              {gData && (
                <div className="mt-1.5">
                  <RankBadge rank={gData.driver_rank} level={gData.level} />
                </div>
              )}
            </div>
            {/* Quick start */}
            <Link href="/simulation" id="start-simulation-btn">
              <motion.div
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
                whileHover={{ scale: 1.04, boxShadow: '0 6px 28px rgba(99,102,241,0.55)' }}
                whileTap={{ scale: 0.97 }}
              >
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Play</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* ── Tab navigation ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200"
              style={{
                color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'transparent',
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
              {(tab.badge ?? 0) > 0 && (
                <span className="absolute top-0.5 right-1 flex items-center justify-center w-4 h-4 rounded-full text-white font-bold"
                  style={{ fontSize: 8, background: '#ef4444' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ HOME TAB ══════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-3">
            {/* XP + Streak row */}
            <div className="grid grid-cols-2 gap-3">
              {/* XP Card */}
              <motion.div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>
                  Total XP
                </p>
                <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                  {isLoadingAny ? '—' : <AnimatedNumber value={gData?.xp ?? 0} />}
                </p>
                <div className="mt-2">
                  {gData && (
                    <XPBar
                      xp={gData.xp}
                      currentLevelXP={gData.current_level_xp}
                      nextLevelXP={gData.next_level_xp}
                      level={gData.level}
                      progressPct={gData.level_progress_pct}
                      xpToNext={gData.xp_to_next}
                      compact
                    />
                  )}
                </div>
              </motion.div>

              {/* Streak Card */}
              <motion.div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.1), rgba(249,115,22,0.07))',
                  border: '1px solid rgba(251,146,60,0.2)',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {gData ? (
                  <StreakWidget
                    currentStreak={gData.current_streak}
                    longestStreak={gData.longest_streak}
                    compact
                  />
                ) : (
                  <div className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(251,146,60,0.08)' }} />
                )}
              </motion.div>
            </div>

            {/* Driver Identity + Focus Score */}
            <motion.div
              className="grid grid-cols-3 gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {[
                {
                  label: 'Identity',
                  value: gData?.driver_identity ?? '—',
                  color: '#a78bfa',
                  bg: 'rgba(167,139,250,0.08)',
                  border: 'rgba(167,139,250,0.2)',
                  isText: true,
                },
                {
                  label: 'Focus Score',
                  value: stats?.avg_score ?? 0,
                  suffix: '%',
                  color: '#34d399',
                  bg: 'rgba(52,211,153,0.08)',
                  border: 'rgba(52,211,153,0.2)',
                },
                {
                  label: 'Sessions',
                  value: gData?.total_sessions_completed ?? 0,
                  color: '#60a5fa',
                  bg: 'rgba(96,165,250,0.08)',
                  border: 'rgba(96,165,250,0.2)',
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl"
                  style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {stat.label}
                  </p>
                  <p
                    className="font-black leading-tight"
                    style={{
                      color: stat.color,
                      fontSize: stat.isText ? 11 : 18,
                      lineHeight: stat.isText ? 1.2 : 1,
                    }}
                  >
                    {stat.isText
                      ? stat.value
                      : isLoadingAny ? '—' : <AnimatedNumber value={stat.value as number} suffix={stat.suffix} />
                    }
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Daily Challenge */}
            {gData?.daily_challenge && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <DailyChallenge challenge={gData.daily_challenge} />
              </motion.div>
            )}

            {/* BIG Play Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/simulation">
                <motion.div
                  className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center gap-3 py-5"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                    boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.01, boxShadow: '0 12px 40px rgba(99,102,241,0.6)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Animated rings */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: '2px solid rgba(255,255,255,0.2)' }}
                    animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <PlayCircle className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-black text-base leading-tight">Start Simulation</p>
                    <p className="text-white/70 text-xs font-medium">+50 XP per session</p>
                  </div>
                </motion.div>
              </Link>
            </motion.div>

            {/* AI Coach message */}
            {stats?.ai_feedback && (
              <motion.div
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))' }}
                >
                  <span style={{ fontSize: 16 }}>🤖</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#a78bfa' }}>
                    AI Coach
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {/* Truncate to ~120 chars for brevity */}
                    {stats.ai_feedback.length > 120
                      ? stats.ai_feedback.slice(0, 117) + '…'
                      : stats.ai_feedback}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Achievement shelf */}
            <motion.div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Achievements {unlockedAchs.length > 0 && `(${unlockedAchs.length})`}
                </p>
                <Trophy className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
              </div>
              {isLoadingAny ? (
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-14 h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  ))}
                </div>
              ) : (
                <div
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {/* Unlocked first */}
                  {unlockedAchs.map(ach => (
                    <div key={ach.id} className="shrink-0">
                      <AchievementBadge
                        achievement={ach}
                        size="md"
                        showLabel
                        animateUnlock={newlyUnlockedKeys.includes(ach.key)}
                      />
                    </div>
                  ))}
                  {/* Locked silhouettes (first 5) */}
                  {lockedAchs.slice(0, 5).map(ach => (
                    <div key={ach.id} className="shrink-0">
                      <AchievementBadge achievement={ach} size="md" showLabel />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Navigation */}
            <motion.div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                Quick Nav
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(a => (
                  <Link key={a.label} href={a.href}>
                    <div
                      className="flex items-center gap-2.5 p-3 rounded-xl transition-all duration-150"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <a.icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-none truncate" style={{ color: 'var(--color-text-primary)' }}>{a.label}</p>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{a.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ══ FRIENDS TAB ════════════════════════════════════════════════════════ */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#fbbf24' }}>
                  Incoming Requests ({pendingRequests.length})
                </p>
                <div className="space-y-2">
                  {pendingRequests.map(f => (
                    <div key={f.friendship_id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{f.friend_name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Lv. {f.friend_level} · {f.friend_rank}</p>
                      </div>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        onClick={async () => {
                          try {
                            await acceptFriendRequest(f.friendship_id);
                            toast.success('Friend added! 🎉');
                            dispatch(fetchFriends());
                          } catch { toast.error('Failed to accept.'); }
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Friends ({acceptedFriends.length})
                </p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {acceptedFriends.length === 0 ? (
                <div className="text-center py-6">
                  <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No friends yet.</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Add friends to challenge them!</p>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    Add Your First Friend ⚡
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {acceptedFriends.map(f => (
                    <div
                      key={f.friendship_id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                          {f.friend_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{f.friend_name}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Lv. {f.friend_level} · {f.friend_xp.toLocaleString()} XP
                          </p>
                        </div>
                      </div>
                      <button
                        title="Challenge"
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                        onClick={async () => {
                          try {
                            const res = await challengeFriend(f.friendship_id);
                            toast.success(res.message);
                            playSound('achievement');
                          } catch (e: any) {
                            toast.error(e.response?.data?.detail || 'Failed.');
                          }
                        }}
                      >
                        <Swords className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent requests */}
            {sentPending.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Sent Requests
                </p>
                <div className="space-y-1.5">
                  {sentPending.map(f => (
                    <div key={f.friendship_id} className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{f.friend_name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD TAB ════════════════════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {currentUserRank && (
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Your Global Rank</p>
                <p className="text-2xl font-black" style={{ color: '#a78bfa' }}>#{currentUserRank}</p>
              </div>
            )}

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="p-4 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  🏆 XP Leaderboard
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No data yet. Complete sessions to appear here!</p>
                  </div>
                ) : (
                  leaderboard.map((entry, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        background: entry.is_current_user
                          ? 'rgba(99,102,241,0.1)'
                          : 'transparent',
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {/* Rank medal */}
                      <div className="w-7 text-center font-black" style={{
                        color: entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#94a3b8' : entry.rank === 3 ? '#fb923c' : 'var(--color-text-muted)',
                        fontSize: 13,
                      }}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: entry.is_current_user ? '#a78bfa' : 'var(--color-text-primary)' }}>
                          {entry.display_name} {entry.is_current_user && '(You)'}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          Lv. {entry.level} · {entry.driver_rank}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black tabular-nums" style={{ color: '#a78bfa' }}>
                          {entry.xp.toLocaleString()}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>XP</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}
