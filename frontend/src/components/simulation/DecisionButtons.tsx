import { ShieldCheck, PhoneOff } from 'lucide-react';

interface DecisionButtonsProps {
  onIgnore: () => void;
  onInteract: () => void;
  isDisabled?: boolean;
}

export default function DecisionButtons({ onIgnore, onInteract, isDisabled }: DecisionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 animate-slide-up">
      {/* SAFE: Ignore */}
      <button
        id="decision-ignore-btn"
        onClick={onIgnore}
        disabled={isDisabled}
        className="group relative overflow-hidden bg-brand-900/40 hover:bg-brand-800/60
          border-2 border-brand-700 hover:border-brand-500
          text-brand-400 hover:text-white
          py-5 px-4 rounded-2xl text-center
          transition-all duration-200 hover:-translate-y-1 hover:shadow-brand
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors rounded-2xl" />
        <div className="relative">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
          <p className="font-bold text-sm">KEEP DRIVING</p>
          <p className="text-xs opacity-70 mt-1">Ignore distraction</p>
          <div className="mt-2 text-xs font-semibold text-brand-300">
            +10 pts ↑
          </div>
        </div>
      </button>

      {/* RISKY: Interact */}
      <button
        id="decision-interact-btn"
        onClick={onInteract}
        disabled={isDisabled}
        className="group relative overflow-hidden bg-red-900/30 hover:bg-red-800/50
          border-2 border-red-800 hover:border-red-600
          text-red-400 hover:text-white
          py-5 px-4 rounded-2xl text-center
          transition-all duration-200 hover:-translate-y-1
          hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors rounded-2xl" />
        <div className="relative">
          <PhoneOff className="w-8 h-8 mx-auto mb-2" />
          <p className="font-bold text-sm">INTERACT</p>
          <p className="text-xs opacity-70 mt-1">Pick up / respond</p>
          <div className="mt-2 text-xs font-semibold text-red-300">
            −15 to −20 pts ↓
          </div>
        </div>
      </button>
    </div>
  );
}
