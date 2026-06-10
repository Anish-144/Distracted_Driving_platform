import { motion } from 'framer-motion';
import { Skull, Timer, ChevronRight } from 'lucide-react';
import { ActiveEventItem } from '@/api/gamification';
import { useEffect, useState } from 'react';

interface Props {
  event: ActiveEventItem;
  onPlay: (id: string) => void;
}

export default function EventBannerWidget({ event, onPlay }: Props) {
  const [timeLeft, setTimeLeft] = useState(event.time_remaining_sec);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [event.time_remaining_sec]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      className="w-full mb-6 relative overflow-hidden rounded-[2rem] bg-slate-900 border border-slate-700 shadow-2xl group cursor-pointer"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay(event.id)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-purple-900/20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      
      <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Skull className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-500 text-white">
                {event.difficulty_label}
              </span>
              <span className="text-xs font-bold text-red-400">🔥 {event.reward_multiplier}x XP MULTIPLIER</span>
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">{event.title}</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-sm line-clamp-2">{event.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-slate-700 md:border-t-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Ends In</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-xl border border-slate-800">
              <Timer className="w-4 h-4 text-slate-400" />
              <span className="text-white font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
