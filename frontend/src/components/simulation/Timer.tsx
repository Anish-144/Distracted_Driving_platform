import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number; // seconds
  onExpire: () => void;
}

export default function Timer({ duration, onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasExpired = useRef(false);

  useEffect(() => {
    hasExpired.current = false;
    setTimeLeft(duration);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasExpired.current) {
            hasExpired.current = true;
            setTimeout(onExpire, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onExpire]);

  const pct = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 3;

  return (
    <div className="w-full mt-4 px-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1.5 text-sm font-medium ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
          <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
          <span>{isUrgent ? '⚡ ' : ''}React now!</span>
        </div>
        <span className={`text-lg font-bold tabular-nums ${
          isUrgent ? 'text-red-400 animate-pulse' : 'text-brand-400'
        }`}>
          {timeLeft}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-600 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-[width] duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : 'bg-brand-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
