import { ShieldCheck, PhoneOff, AlertTriangle } from 'lucide-react';

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
        const isSafe = choice.risk === 'safe';
        const isHighRisk = choice.risk === 'high';
        
        return (
          <button
            key={i}
            onClick={() => onDecision(choice.action, choice.risk)}
            disabled={isDisabled}
            className={`group relative overflow-hidden text-left
              border p-4 rounded-xl transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5
              ${isSafe 
                ? 'bg-brand-900/30 hover:bg-brand-800/50 border-brand-700/50 hover:border-brand-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] text-brand-300' 
                : isHighRisk
                  ? 'bg-red-900/30 hover:bg-red-800/50 border-red-800/50 hover:border-red-600 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] text-red-300'
                  : 'bg-amber-900/30 hover:bg-amber-800/50 border-amber-800/50 hover:border-amber-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-300'
              }
            `}
          >
            <div className="relative flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {isSafe ? <ShieldCheck className="w-5 h-5 text-brand-400" /> : 
                 isHighRisk ? <PhoneOff className="w-5 h-5 text-red-500" /> :
                 <AlertTriangle className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1 leading-relaxed pr-2">
                  {choice.text}
                </p>
                <div className="text-[10px] font-bold tracking-wider uppercase opacity-80 mt-1 flex items-center justify-between">
                  <span>{isSafe ? 'Defensive Decision' : isHighRisk ? 'High Risk Decision' : 'Sub-Optimal Decision'}</span>
                  <span>{isSafe ? '+10 PTS' : '-15 PTS'}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
