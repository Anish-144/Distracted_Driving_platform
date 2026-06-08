import { motion } from 'framer-motion';
import { AchievementData } from '@/api/gamification';

// Map icon_key strings to emoji (no extra dep needed)
const ICON_MAP: Record<string, string> = {
  rocket:       '🚀',
  flag:         '🏁',
  shield:       '🛡️',
  eye:          '👁️',
  flame:        '🔥',
  crown:        '👑',
  zap:          '⚡',
  trophy:       '🏆',
  star:         '⭐',
  bell_off:     '🔕',
  check_circle: '✅',
  users:        '👥',
  swords:       '⚔️',
  map:          '🗺️',
  crosshair:    '🎯',
  medal:        '🥇',
};

interface AchievementBadgeProps {
  achievement: AchievementData;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animateUnlock?: boolean;
}

const sizeMap = {
  sm: { outer: 44, inner: 24, fontSize: 14, label: 10 },
  md: { outer: 60, inner: 32, fontSize: 20, label: 11 },
  lg: { outer: 76, inner: 40, fontSize: 26, label: 12 },
};

export default function AchievementBadge({
  achievement,
  size = 'md',
  showLabel = true,
  animateUnlock = false,
}: AchievementBadgeProps) {
  const s = sizeMap[size];
  const icon = ICON_MAP[achievement.icon_key] || '⭐';
  const { unlocked, title } = achievement;

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 cursor-default"
      title={`${title} — ${achievement.description}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: s.outer,
          height: s.outer,
          background: unlocked
            ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'
            : 'rgba(255,255,255,0.04)',
          border: unlocked
            ? '1.5px solid rgba(139,92,246,0.5)'
            : '1.5px solid rgba(255,255,255,0.08)',
          boxShadow: unlocked
            ? '0 0 16px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
            : 'none',
        }}
        animate={animateUnlock && unlocked ? {
          scale: [1, 1.25, 1],
          rotate: [0, -8, 8, 0],
          boxShadow: [
            '0 0 16px rgba(139,92,246,0.25)',
            '0 0 40px rgba(139,92,246,0.8)',
            '0 0 16px rgba(139,92,246,0.25)',
          ],
        } : {}}
        transition={{ duration: 0.6, ease: 'backOut' }}
      >
        <span
          style={{
            fontSize: s.fontSize,
            filter: unlocked ? 'none' : 'grayscale(1) brightness(0.3)',
            userSelect: 'none',
          }}
        >
          {icon}
        </span>

        {/* XP chip on unlocked */}
        {unlocked && (
          <div
            className="absolute -bottom-1.5 -right-1.5 rounded-full flex items-center justify-center font-bold"
            style={{
              fontSize: 8,
              padding: '1px 4px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: '1.5px solid rgba(15,15,30,0.8)',
              minWidth: 20,
            }}
          >
            +{achievement.xp_reward}
          </div>
        )}

        {/* Lock icon on locked */}
        {!unlocked && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          >
            <span style={{ fontSize: s.fontSize * 0.55, opacity: 0.5 }}>🔒</span>
          </div>
        )}
      </motion.div>

      {showLabel && (
        <p
          className="text-center font-semibold leading-tight"
          style={{
            fontSize: s.label,
            maxWidth: s.outer + 8,
            color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </p>
      )}
    </motion.div>
  );
}
