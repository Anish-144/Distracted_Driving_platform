

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

export default function DecisionButtons({ choices, onDecision, isDisabled }: DecisionButtonsProps) {
  if (!choices || choices.length === 0) {
    return <div className="animate-pulse h-24 bg-surface-700/50 border border-surface-600 rounded-xl" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 animate-slide-up w-full">
      {choices.map((choice, i) => {
        return (
          <button
            key={i}
            onClick={() => onDecision(choice.action, choice.risk)}
            disabled={isDisabled}
            className={`group relative overflow-hidden text-left
              bg-secondary border border-subtle hover:bg-tertiary hover:border-muted
              p-4 rounded-xl transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5
            `}
          >
            <div className="relative flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary mb-1 leading-relaxed pr-2">
                  {choice.text}
                </p>
                <div className="text-[10px] font-bold tracking-wider uppercase opacity-50 mt-1 flex items-center justify-between text-muted">
                  <span>Option {String.fromCharCode(65 + i)}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
