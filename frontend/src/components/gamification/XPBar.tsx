import { motion } from 'framer-motion';

interface XPBarProps {
  xp: number;
  currentLevelXP: number;
  nextLevelXP: number;
  level: number;
  progressPct: number;
  xpToNext: number;
  compact?: boolean;
}

export default function XPBar({
  xp, currentLevelXP, nextLevelXP, level, progressPct, xpToNext, compact = false,
}: XPBarProps) {
  return (
    <div className={compact ? 'w-full' : 'w-full px-1'}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center justify-center rounded-lg font-black text-xs leading-none"
            style={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: compact ? 11 : 13,
            }}
          >
            {level}
          </div>
          <span
            className="font-bold tracking-tight"
            style={{ fontSize: compact ? 12 : 13, color: 'var(--color-text-primary)' }}
          >
            Level {level}
          </span>
        </div>
        <span
          className="font-semibold tabular-nums"
          style={{ fontSize: compact ? 10 : 11, color: 'var(--color-text-muted)' }}
        >
          {xpToNext.toLocaleString()} XP to next
        </span>
      </div>

      {/* Bar track */}
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{
          height: compact ? 6 : 8,
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.18)',
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
            boxShadow: '0 0 8px rgba(139,92,246,0.6)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        />
      </div>
    </div>
  );
}
