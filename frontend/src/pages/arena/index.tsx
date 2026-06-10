import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchGamificationData } from '@/store/gamificationSlice';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import XPBar from '@/components/gamification/XPBar';
import StreakWidget from '@/components/gamification/StreakWidget';
import SwipeableFeedView from '@/components/gamification/SwipeableFeedView';
import FastSessionWidget from '@/components/gamification/FastSessionWidget';
import EventBannerWidget from '@/components/gamification/EventBannerWidget';
import DailyMissions from '@/components/gamification/DailyMissions';
import WeeklyBoss from '@/components/gamification/WeeklyBoss';
import { getChallengeFeed, getBlitzChallenges, getActiveEvent, ChallengeFeedItem, ActiveEventItem, applyStreakFreeze } from '@/api/gamification';
import { Target, Snowflake } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ArenaPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: gData, isLoading: gLoading } = useAppSelector((state) => state.gamification);
  const [isMounted, setIsMounted] = useState(false);

  const [feed, setFeed] = useState<ChallengeFeedItem[]>([]);
  const [blitz, setBlitz] = useState<ChallengeFeedItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActiveEventItem | null>(null);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [usingFreeze, setUsingFreeze] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated && isMounted) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router, isMounted]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchGamificationData());
      Promise.all([getChallengeFeed(), getBlitzChallenges(), getActiveEvent()])
        .then(([feedData, blitzData, eventData]) => {
          setFeed(feedData);
          setBlitz(blitzData);
          setActiveEvent(eventData);
        })
        .catch(() => toast.error('Failed to load the arena feed.'))
        .finally(() => setLoadingFeeds(false));
    }
  }, [isAuthenticated, dispatch]);

  const handleUseFreeze = async () => {
    if (usingFreeze) return;
    setUsingFreeze(true);
    try {
      const res = await applyStreakFreeze();
      toast.success(`❄️ ${res.message} (${res.tokens_remaining} tokens left)`);
      dispatch(fetchGamificationData());
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No freeze tokens available');
    } finally {
      setUsingFreeze(false);
    }
  };

  if (!isMounted) return null;

  if (!isAuthenticated || gLoading || loadingFeeds) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handlePlayChallenge = () => router.push('/simulation');

  return (
    <>
      <Head>
        <title>Arena — REFLEX</title>
        <meta name="description" content="Your daily arena: missions, challenges, and weekly boss fights." />
      </Head>

      <AppShell>
        <div className="max-w-md mx-auto pb-24">

          {/* Top Bar: XP, Level, Streak */}
          <FadeUp className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-primary tracking-tight italic uppercase">Arena</h1>
                  <p className="text-xs text-brand-400 font-bold tracking-wider">{gData?.driver_rank || 'Iron'} • Lvl {gData?.level || 1}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Streak Freeze Button */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={handleUseFreeze}
                  disabled={usingFreeze}
                  title="Use a streak freeze token"
                  className="flex items-center gap-1 rounded-xl bg-sky-500/10 border border-sky-500/20 px-2.5 py-1.5 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-all disabled:opacity-50"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  Freeze
                </motion.button>
                <StreakWidget currentStreak={gData?.current_streak || 0} longestStreak={gData?.longest_streak || 0} />
              </div>
            </div>
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
          </FadeUp>

          {/* Active Event Banner */}
          {activeEvent && (
            <FadeUp delay={0.04} className="mb-6">
              <EventBannerWidget event={activeEvent} onPlay={handlePlayChallenge} />
            </FadeUp>
          )}

          {/* ── Daily Missions (Phase 1) ── */}
          <FadeUp delay={0.08} className="mb-6">
            <DailyMissions />
          </FadeUp>

          {/* ── Weekly Boss (Phase 1) ── */}
          <FadeUp delay={0.12} className="mb-8">
            <WeeklyBoss />
          </FadeUp>

          {/* Main Challenge Feed */}
          <FadeUp delay={0.16} className="mb-8">
            <SwipeableFeedView challenges={feed} onPlay={handlePlayChallenge} />
          </FadeUp>

          {/* Fast Sessions */}
          <FadeUp delay={0.22}>
            <FastSessionWidget challenges={blitz} onPlay={handlePlayChallenge} />
          </FadeUp>

        </div>
      </AppShell>
    </>
  );
}
