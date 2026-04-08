interface ScoreDisplayProps {
  score: number;
}

export default function ScoreDisplay({ score }: ScoreDisplayProps) {
  const color =
    score >= 90 ? 'text-brand-400' : score >= 70 ? 'text-accent-400' : score >= 50 ? 'text-orange-400' : 'text-red-400';

  const ringColor =
    score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444';

  const pct = (score / 100) * 251.2;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeDasharray={`${pct} 251.2`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{Math.round(score)}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500">Score</p>
        <p className={`text-sm font-semibold ${color}`}>
          {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk'}
        </p>
      </div>
    </div>
  );
}
