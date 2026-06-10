import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchGamificationData } from '@/store/gamificationSlice';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import XPBar from '@/components/gamification/XPBar';
import DriverClassCard from '@/components/gamification/DriverClassCard';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import {
  Shield, Zap, Eye, Ghost, Star,
  Target, Flame, Trophy, Activity, Clock
} from 'lucide-react';
import DistractionHeatmap from '@/components/insights/DistractionHeatmap';


const IDENTITY_COLORS: Record<string, string> = {
  guardian: 'from-emerald-500 to-teal-400',
  bolt:     'from-indigo-500 to-brand-400',
  viper:    'from-rose-500 to-orange-400',
  phantom:  'from-slate-500 to-zinc-600',
  nova:     'from-amber-400 to-orange-500',
  unknown:  'from-brand-500 to-brand-400',
};

const IDENTITY_ICON: Record<string, JSX.Element> = {
  guardian: <Shield className="w-14 h-14 text-white" />,
  bolt:     <Zap className="w-14 h-14 text-white" />,
  viper:    <Eye className="w-14 h-14 text-white" />,
  phantom:  <Ghost className="w-14 h-14 text-white" />,
  nova:     <Star className="w-14 h-14 text-white" />,
  unknown:  <Shield className="w-14 h-14 text-white" />,
};

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { data: gData, isLoading } = useAppSelector((s) => s.gamification);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (!isAuthenticated && isMounted) router.replace('/auth/login');
  }, [isAuthenticated, isMounted, router]);
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchGamificationData());
  }, [isAuthenticated, dispatch]);

  if (!isMounted || isLoading || !gData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const identity = (gData.driver_identity || 'unknown').toLowerCase();
  const gradient = IDENTITY_COLORS[identity] ?? IDENTITY_COLORS['unknown'];
  const icon = IDENTITY_ICON[identity] ?? IDENTITY_ICON['unknown'];
  const unlockedAchievements = gData.achievements.filter((a) => a.unlocked);

  const stats = [
    { label: 'Total XP',       value: gData.total_xp_earned.toLocaleString(), icon: <Zap className="w-4 h-4 text-brand-400" /> },
    { label: 'Sessions',       value: gData.total_sessions_completed,          icon: <Target className="w-4 h-4 text-emerald-400" /> },
    { label: 'Current Streak', value: `${gData.current_streak}d`,              icon: <Flame className="w-4 h-4 text-orange-400" /> },
    { label: 'Best Streak',    value: `${gData.longest_streak}d`,              icon: <Trophy className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <>
      <Head>
        <title>Profile — REFLEX</title>
        <meta name="description" content="Your REFLEX driver profile — stats, rank, and achievements." />
      </Head>
      <AppShell>
        <div className="max-w-md mx-auto pb-24">

          {/* Holographic Driver Card Hero */}
          <FadeUp className="mb-6">
            <motion.div
              className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${gradient} p-px shadow-2xl`}
              whileHover={{ scale: 1.01 }}
            >
              {/* Holographic shimmer */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{
                  background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                  backgroundSize: '200% 200%',
                }}
              />
              <div className={`relative rounded-3xl bg-gradient-to-br ${gradient} p-6`}>
                <div className="flex items-center gap-5">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center"
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {icon}
                  </motion.div>
                  <div>
                    <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-1">Driver Identity</p>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
                      {gData.driver_identity}
                    </h1>
                    <p className="text-white/70 text-sm font-bold">
                      {gData.driver_rank} · Level {gData.level}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <XPBar
                    xp={gData.xp}
                    currentLevelXP={gData.current_level_xp}
                    nextLevelXP={gData.next_level_xp}
                    level={gData.level}
                    progressPct={gData.level_progress_pct}
                    xpToNext={gData.xp_to_next}
                    compact
                  />
                </div>

                {/* Tier dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {[1, 2, 3].map((t) => (
                    <div
                      key={t}
                      className={`h-1.5 rounded-full transition-all ${
                        t <= gData.class_tier ? 'bg-white w-6' : 'bg-white/20 w-3'
                      }`}
                    />
                  ))}
                  <span className="text-white/50 text-[10px] ml-1">Tier {gData.class_tier}</span>
                </div>
              </div>
            </motion.div>
          </FadeUp>

          {/* Quick Stats */}
          <FadeUp delay={0.06} className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 + i * 0.04 }}
                  className="rounded-2xl border border-white/8 bg-white/3 p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {s.icon}
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                </motion.div>
              ))}
            </div>
          </FadeUp>

          {/* Class Evolution Card */}
          <FadeUp delay={0.1} className="mb-6">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                Class Evolution
              </h2>
              <DriverClassCard />
            </div>
          </FadeUp>

          {/* Achievements Wall */}
          <FadeUp delay={0.14}>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Achievements
                <span className="ml-auto text-xs font-bold text-muted">
                  {unlockedAchievements.length}/{gData.achievements.length}
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {gData.achievements.map((ach) => (
                  <AchievementBadge key={ach.key} achievement={ach} />
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Distraction Vulnerability Heatmap */}
          <FadeUp delay={0.18} className="mb-6">
            <DistractionHeatmap />
          </FadeUp>

        </div>
      </AppShell>
    </>
  );
}
