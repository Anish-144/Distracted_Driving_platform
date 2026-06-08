import { motion } from 'framer-motion';
import { DailyChallengeData } from '@/api/gamification';
import { Zap } from 'lucide-react';

interface DailyChallengeProps {
  challenge: DailyChallengeData;
}

export default function DailyChallenge({ challenge }: DailyChallengeProps) {
  const pct = challenge.target_value > 0
    ? Math.min((challenge.progress / challenge.target_value) * 100, 100)
    : 0;
  const done = challenge.completed;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: done
          ? 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(16,185,129,0.08))'
          : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
        border: done
          ? '1px solid rgba(52,211,153,0.3)'
          : '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: done
            ? 'radial-gradient(ellipse at top right, rgba(52,211,153,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at top right, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: done ? '#34d399' : '#a78bfa' }}>
                {done ? '✓ COMPLETE' : '📅 TODAY\'S MISSION'}
              </span>
            </div>
            <h3 className="text-sm font-bold leading-tight"
              style={{ color: 'var(--color-text-primary)' }}>
              {challenge.title}
            </h3>
            <p className="text-xs mt-0.5 leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}>
              {challenge.description}
            </p>
          </div>
          {/* XP Reward chip */}
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg font-bold"
            style={{
              background: done
                ? 'rgba(52,211,153,0.15)'
                : 'rgba(99,102,241,0.15)',
              border: done
                ? '1px solid rgba(52,211,153,0.3)'
                : '1px solid rgba(99,102,241,0.3)',
              color: done ? '#34d399' : '#818cf8',
              fontSize: 12,
            }}
          >
            <Zap className="w-3 h-3" />
            +{challenge.xp_reward} XP
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Progress
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {challenge.progress}/{challenge.target_value}
            </span>
          </div>
          <div
            className="relative w-full rounded-full overflow-hidden"
            style={{
              height: 6,
              background: done ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.12)',
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: done
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                boxShadow: done
                  ? '0 0 6px rgba(52,211,153,0.6)'
                  : '0 0 6px rgba(139,92,246,0.6)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
