export interface ResponseChoice {
  text: string;
  action: 'ignored' | 'interacted';
  risk: 'safe' | 'medium' | 'high';
}

interface DecisionButtonsProps {
  choices: ResponseChoice[];
  onDecision: (action: 'ignored' | 'interacted', risk: string) => void;
  isDisabled?: boolean;
}

const riskAccent: Record<string, string> = {
  safe: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

export default function DecisionButtons({ choices, onDecision, isDisabled }: DecisionButtonsProps) {
  if (!choices || choices.length === 0) {
    return <div className="animate-pulse h-24 rounded-xl" style={{ background: 'var(--bg-surface)' }} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 animate-slide-up w-full">
      {choices.map((choice, i) => {
        const accent = riskAccent[choice.risk] ?? '#6b7280';
        return (
          <button
            key={i}
            onClick={() => onDecision(choice.action, choice.risk)}
            disabled={isDisabled}
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-primary)',
            }}
            className={`group relative overflow-hidden text-left
              border rounded-xl p-4 transition-all duration-200
              hover:border-brand-500 hover:-translate-y-0.5 hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            `}
          >
            {/* Left accent stripe — color-coded by risk */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-opacity duration-200 opacity-0 group-hover:opacity-100"
              style={{ background: accent }}
            />
            <div className="relative flex items-start gap-3 pl-1">
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1 leading-relaxed pr-2" style={{ color: 'var(--text-primary)' }}>
                  {choice.text}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                    Option {String.fromCharCode(65 + i)}
                  </span>
                  <span
                    className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
                    style={{ color: accent, background: `${accent}20` }}
                  >
                    {choice.risk}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
