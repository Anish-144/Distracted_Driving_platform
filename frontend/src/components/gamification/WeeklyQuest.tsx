import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface WeeklyQuestProps {
  progress: number;
  targetValue: number;
}

export default function WeeklyQuest({ progress, targetValue }: WeeklyQuestProps) {
  const pct = targetValue > 0
    ? Math.min((progress / targetValue) * 100, 100)
    : 0;
  const done = progress >= targetValue;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 mt-3"
      style={{
        background: done
          ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(202,138,4,0.08))'
          : 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(225,29,72,0.08))',
        border: done
          ? '1px solid rgba(234,179,8,0.3)'
          : '1px solid rgba(244,63,94,0.25)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: done
            ? 'radial-gradient(ellipse at top right, rgba(234,179,8,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at top right, rgba(244,63,94,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: done ? '#facc15' : '#fb7185' }}>
                {done ? '🏆 EPIC QUEST COMPLETE' : '🔥 WEEKLY EPIC QUEST'}
              </span>
            </div>
            <h3 className="text-sm font-bold leading-tight"
              style={{ color: 'var(--color-text-primary)' }}>
              Marathon Driver
            </h3>
            <p className="text-xs mt-0.5 leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}>
              Complete {targetValue} simulation sessions this week to unlock the legendary Marathon Badge.
            </p>
          </div>
          {/* XP Reward chip */}
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg font-bold"
            style={{
              background: done
                ? 'rgba(234,179,8,0.15)'
                : 'rgba(244,63,94,0.15)',
              border: done
                ? '1px solid rgba(234,179,8,0.3)'
                : '1px solid rgba(244,63,94,0.3)',
              color: done ? '#facc15' : '#fda4af',
              fontSize: 12,
            }}
          >
            <Target className="w-3 h-3" />
            +1000 XP
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Quest Progress
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {progress}/{targetValue}
            </span>
          </div>
          <div
            className="relative w-full rounded-full overflow-hidden"
            style={{
              height: 8,
              background: done ? 'rgba(234,179,8,0.15)' : 'rgba(244,63,94,0.12)',
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: done
                  ? 'linear-gradient(90deg, #eab308, #facc15)'
                  : 'linear-gradient(90deg, #e11d48, #fb7185)',
                boxShadow: done
                  ? '0 0 8px rgba(234,179,8,0.6)'
                  : '0 0 8px rgba(244,63,94,0.6)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
