import { motion } from 'framer-motion';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

// Generate last 7 days activity dots (stub — treat current streak as filled days)
function getWeekDots(streak: number): boolean[] {
  const dots: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    dots.push(i < Math.min(streak, 7));
  }
  return dots;
}

const flameColors = [
  '#fb923c', '#f97316', '#ea580c',
];

export default function StreakWidget({ currentStreak, longestStreak, compact = false }: StreakWidgetProps) {
  const dots = getWeekDots(currentStreak);
  const isOnFire = currentStreak >= 3;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Flame */}
          <motion.div
            animate={isOnFire ? { scale: [1, 1.12, 1], rotate: [-4, 4, -4] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: compact ? 22 : 28 }}
          >
            🔥
          </motion.div>
          <div>
            <motion.p
              className="font-black leading-none tabular-nums"
              style={{
                fontSize: compact ? 20 : 26,
                background: `linear-gradient(135deg, ${flameColors[0]}, ${flameColors[1]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              key={currentStreak}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
            >
              {currentStreak}
            </motion.p>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              day streak
            </p>
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>BEST</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {longestStreak}d
          </p>
        </div>
      </div>

      {/* 7-day dots */}
      <div className="flex items-center gap-1.5">
        {dots.map((active, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: 5,
              background: active
                ? `linear-gradient(90deg, ${flameColors[0]}, ${flameColors[1]})`
                : 'rgba(251,146,60,0.15)',
              boxShadow: active ? '0 0 4px rgba(249,115,22,0.5)' : 'none',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: 'backOut' }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 500 }}>7 days ago</span>
        <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 500 }}>Today</span>
      </div>
    </div>
  );
}
