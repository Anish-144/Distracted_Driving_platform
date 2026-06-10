import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Clock, Zap } from 'lucide-react';
import { getDailyMissions, DailyMissionData, DailyMissionsResponse } from '@/api/gamification';
import toast from 'react-hot-toast';

function MissionCard({ mission, index }: { mission: DailyMissionData; index: number }) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target_value) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className={`relative rounded-2xl border p-4 overflow-hidden transition-all ${
        mission.completed
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-white/8 bg-white/3'
      }`}
    >
      {/* Completed shimmer */}
      {mission.completed && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          style={{ background: 'linear-gradient(135deg, #10b981 0%, transparent 70%)' }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Emoji slot */}
        <div className="text-2xl leading-none mt-0.5 select-none">{mission.emoji}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-bold tracking-tight ${
                mission.completed ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {mission.title}
            </span>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {mission.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </motion.div>
              ) : (
                <span className="text-xs font-bold text-brand-400">+{mission.xp_reward} XP</span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted mb-2">{mission.description}</p>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${mission.completed ? 'bg-emerald-400' : 'bg-brand-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[11px] font-mono text-muted shrink-0">
              {mission.progress}/{mission.target_value}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyMissions() {
  const [data, setData] = useState<DailyMissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    getDailyMissions()
      .then(setData)
      .catch(() => toast.error('Could not load daily missions'))
      .finally(() => setLoading(false));
  }, []);

  // Countdown to reset
  useEffect(() => {
    if (!data?.reset_at) return;
    const interval = setInterval(() => {
      const diff = new Date(data.reset_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Resetting...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.reset_at]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse">
        <div className="h-4 w-32 bg-white/10 rounded mb-4" />
        {[0, 1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl mb-3" />)}
      </div>
    );
  }

  if (!data) return null;

  const completedCount = data.missions.filter(m => m.completed).length;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Daily Missions
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {completedCount}/3 completed
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted bg-white/5 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3" />
          {timeLeft || '—'}
        </div>
      </div>

      {/* Missions */}
      <div className="space-y-3">
        {data.missions.map((mission, i) => (
          <MissionCard key={mission.id} mission={mission} index={i} />
        ))}
      </div>

      {/* All complete banner */}
      <AnimatePresence>
        {data.all_completed && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center"
          >
            <p className="text-sm font-bold text-emerald-400">🏆 All missions complete! Come back tomorrow!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
