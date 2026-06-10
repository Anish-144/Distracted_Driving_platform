import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export const PASSENGERS = [
  { id: 'none',    name: 'Solo',          emoji: '🎧', description: 'No distractions from passengers', vibe: 'Focused' },
  { id: 'sibling', name: 'Annoying Sibling', emoji: '😤', description: 'Non-stop questions and seat kicking', vibe: 'Chaotic' },
  { id: 'friend',  name: 'Best Friend',   emoji: '😂', description: 'Hype mode ON. Constant jokes and dares', vibe: 'Hype' },
  { id: 'mom',     name: 'Nervous Mom',   emoji: '😰', description: 'Gasps at every turn. "SLOW DOWN!"', vibe: 'Stressful' },
  { id: 'crush',   name: 'Your Crush',    emoji: '😍', description: 'Trying to look cool under pressure', vibe: 'Distracted' },
];

const PASSENGER_KEY = 'reflex_selected_passenger';

export function getSelectedPassenger(): string {
  if (typeof window === 'undefined') return 'none';
  return localStorage.getItem(PASSENGER_KEY) || 'none';
}

export function setSelectedPassenger(id: string): void {
  localStorage.setItem(PASSENGER_KEY, id);
}

interface Props {
  compact?: boolean;
}

export default function PassengerSelector({ compact = false }: Props) {
  const [selected, setSelected] = useState('none');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSelected(getSelectedPassenger());
  }, []);

  const current = PASSENGERS.find(p => p.id === selected) ?? PASSENGERS[0];

  const handleSelect = (id: string) => {
    setSelected(id);
    setSelectedPassenger(id);
    setOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white hover:bg-white/10 transition-all"
        >
          <span className="text-base">{current.emoji}</span>
          <span className="max-w-[80px] truncate">{current.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full mt-2 left-0 z-50 w-56 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              {PASSENGERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/8 transition-all ${
                    p.id === selected ? 'bg-brand-500/10' : ''
                  }`}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-muted">{p.vibe}</p>
                  </div>
                  {p.id === selected && (
                    <span className="ml-auto text-brand-400 text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full card mode for simulation pre-screen
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">
        🚗 Who&apos;s Riding with You?
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {PASSENGERS.map(p => (
          <motion.button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all border ${
              p.id === selected
                ? 'border-brand-500/40 bg-brand-500/10'
                : 'border-white/8 bg-white/3 hover:bg-white/6'
            }`}
          >
            <span className="text-2xl">{p.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{p.name}</p>
              <p className="text-xs text-muted">{p.description}</p>
            </div>
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
              p.id === selected
                ? 'bg-brand-500/20 text-brand-400'
                : 'bg-white/5 text-muted'
            }`}>
              {p.vibe}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
