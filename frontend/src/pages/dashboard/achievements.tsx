import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchGamificationData } from '@/store/gamificationSlice';
import AppShell from '@/components/layout/AppShell';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Zap } from 'lucide-react';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import { useSoundEffects } from '@/hooks/useSoundEffects';

const CATEGORY_MAP: Record<string, string> = {
  general: 'Milestones & Progression',
  streak: 'Consistency & Streaks',
  skill: 'Driving Skills',
  social: 'Social & Multiplayer',
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function AchievementsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: gData, isLoading } = useAppSelector((state) => state.gamification);
  const [isMounted, setIsMounted] = useState(false);
  const { playPop } = useSoundEffects();

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated && isMounted) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router, isMounted]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchGamificationData());
    }
  }, [isAuthenticated, dispatch]);

  const achievementsByCategory = useMemo(() => {
    if (!gData?.achievements) return {};
    const grouped: Record<string, typeof gData.achievements> = {};
    for (const ach of gData.achievements) {
      if (!grouped[ach.category]) grouped[ach.category] = [];
      grouped[ach.category].push(ach);
    }
    return grouped;
  }, [gData?.achievements]);

  if (!isMounted) return null;
  if (!isAuthenticated) return null;

  const totalAchievements = gData?.achievements.length || 0;
  const unlockedCount = gData?.achievements.filter(a => a.unlocked).length || 0;
  const progressPct = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

  return (
    <>
      <Head>
        <title>Achievement Gallery — SafeDrive AI</title>
      </Head>

      <AppShell>
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              onClick={() => playPop()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary text-sm font-semibold border border-subtle hover:bg-tertiary hover:text-primary transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="w-px h-6 bg-tertiary" />
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Trophy className="w-6 h-6 text-brand-500" />
              Achievement Gallery
            </h1>
          </div>

          <div className="p-5 rounded-2xl bg-secondary border border-subtle">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-primary">Total Completion</span>
              <span className="text-sm font-bold text-brand-400">{unlockedCount} / {totalAchievements}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-primary overflow-hidden border border-subtle">
              <motion.div
                className="h-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>
        </motion.div>

        {isLoading && !gData ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            {Object.entries(achievementsByCategory).map(([category, achievements]) => (
              <div key={category}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4 pl-1">
                  {CATEGORY_MAP[category] || category}
                </h2>
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                >
                  {achievements.map((ach) => (
                    <motion.div
                      key={ach.id}
                      variants={cardAnim}
                      className="p-4 rounded-2xl border flex flex-col items-center text-center transition-all duration-300"
                      style={{
                        background: ach.unlocked ? 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))' : 'var(--color-bg-secondary)',
                        borderColor: ach.unlocked ? 'rgba(139,92,246,0.3)' : 'var(--color-border-subtle)',
                      }}
                      whileHover={{ y: -4, borderColor: ach.unlocked ? 'rgba(139,92,246,0.6)' : 'var(--color-border-strong)' }}
                    >
                      <AchievementBadge achievement={ach} size="lg" showLabel={false} />
                      <div className="mt-3">
                        <h3 className="text-xs font-bold text-primary mb-1">{ach.title}</h3>
                        <p className="text-[10px] text-muted leading-tight">
                          {ach.unlocked ? ach.description : <span className="flex items-center justify-center gap-1"><Lock className="w-2.5 h-2.5"/> Locked</span>}
                        </p>
                      </div>
                      {ach.unlocked && (
                        <div className="mt-auto pt-2 text-[9px] font-bold text-brand-400 uppercase tracking-widest">
                          Unlocked
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </>
  );
}
