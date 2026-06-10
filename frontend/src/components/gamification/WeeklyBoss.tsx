import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Flame, Clock, Trophy, ChevronRight, Star } from 'lucide-react';
import { getWeeklyBoss, WeeklyBossData } from '@/api/gamification';
import Link from 'next/link';

const DIFFICULTY_STYLE: Record<string, { color: string; bg: string; glow: string }> = {
  Hard:      { color: 'text-orange-400',   bg: 'bg-orange-500/10',   glow: 'shadow-orange-500/20' },
  Extreme:   { color: 'text-red-400',      bg: 'bg-red-500/10',      glow: 'shadow-red-500/20' },
  Legendary: { color: 'text-purple-400',   bg: 'bg-purple-500/10',   glow: 'shadow-purple-500/20' },
  Mythic:    { color: 'text-amber-300',    bg: 'bg-amber-500/10',    glow: 'shadow-amber-500/20' },
};

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  return (
    <span className="font-mono text-xs">
      {d > 0 ? `${d}d ` : ''}{h}h {m}m
    </span>
  );
}

export default function WeeklyBoss() {
  const [boss, setBoss] = useState<WeeklyBossData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklyBoss()
      .then(setBoss)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded mb-3" />
        <div className="h-20 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!boss) return null;

  const style = DIFFICULTY_STYLE[boss.difficulty] ?? DIFFICULTY_STYLE['Hard'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border overflow-hidden ${
        boss.user_beaten
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-red-500/20 bg-red-900/5'
      } shadow-lg ${style.glow}`}
    >
      {/* Animated background pulse for unbeaten boss */}
      {!boss.user_beaten && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(ellipse at 30% 50%, #ef4444 0%, transparent 65%)' }}
        />
      )}

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.bg}`}>
              <Flame className={`w-4 h-4 ${style.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest text-muted uppercase">Weekly Boss</p>
              <p className={`text-xs font-bold ${style.color}`}>{boss.difficulty}</p>
            </div>
          </div>

          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono text-muted ${style.bg}`}>
            <Clock className="w-3 h-3" />
            <Countdown seconds={boss.time_remaining_sec} />
          </div>
        </div>

        {/* Boss title */}
        <h3 className="text-xl font-black text-white tracking-tighter mb-0.5">{boss.title}</h3>
        <p className={`text-xs font-semibold italic mb-3 ${style.color}`}>&ldquo;{boss.tagline}&rdquo;</p>
        <p className="text-xs text-muted mb-4 leading-relaxed">{boss.description}</p>

        {/* Stats row */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-white/5 p-2.5 text-center">
            <div className="text-lg font-black text-white">{boss.target_score}%</div>
            <div className="text-[10px] text-muted">Target Score</div>
          </div>
          <div className="flex-1 rounded-xl bg-white/5 p-2.5 text-center">
            <div className="text-lg font-black text-brand-400">+{boss.xp_reward}</div>
            <div className="text-[10px] text-muted">XP Reward</div>
          </div>
          <div className="flex-1 rounded-xl bg-white/5 p-2.5 text-center">
            <div className="text-lg font-black text-amber-400">{boss.user_best_score}%</div>
            <div className="text-[10px] text-muted">Your Best</div>
          </div>
        </div>

        {/* CTA or beaten badge */}
        {boss.user_beaten ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-2.5">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">BOSS DEFEATED!</span>
            <Star className="w-4 h-4 text-emerald-400" />
          </div>
        ) : (
          <Link href="/simulation">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-black text-sm tracking-wide transition-all ${style.bg} ${style.color} border border-current/20`}
            >
              <Shield className="w-4 h-4" />
              ACCEPT THE CHALLENGE
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
