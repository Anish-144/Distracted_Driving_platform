import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import { ChallengeFeedItem } from '@/api/gamification';

interface Props {
  challenges: ChallengeFeedItem[];
  onPlay: (id: string) => void;
}

export default function FastSessionWidget({ challenges, onPlay }: Props) {
  if (challenges.length === 0) return null;

  return (
    <div className="w-full mt-6 bg-secondary border border-subtle rounded-3xl overflow-hidden shadow-lg relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Zap className="w-24 h-24 text-brand-500" />
      </div>
      
      <div className="p-5 border-b border-subtle relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">2-Minute Blitz</h3>
        </div>
        <p className="text-xs text-muted">Short on time? Play these fast-paced micro-challenges.</p>
      </div>
      
      <div className="divide-y divide-subtle relative z-10">
        {challenges.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-primary/50 transition-colors">
            <div>
              <p className="font-bold text-sm text-primary uppercase">{c.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-brand-400 font-bold">+{c.xp_reward} XP</span>
                <span className="text-[10px] text-muted font-bold tracking-wider">{c.duration_sec}s</span>
              </div>
            </div>
            <button 
              onClick={() => onPlay(c.id)}
              className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
