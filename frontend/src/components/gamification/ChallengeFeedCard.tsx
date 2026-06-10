import { motion } from 'framer-motion';
import { Target, Zap, Clock, Shield, MessageCircle, MapPinned } from 'lucide-react';
import { ChallengeFeedItem } from '@/api/gamification';

interface Props {
  challenge: ChallengeFeedItem;
  onPlay: (id: string) => void;
  onSkip?: (id: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'adaptive': return <Zap className="w-8 h-8" />;
    case 'highway': return <MapPinned className="w-8 h-8" />;
    case 'city': return <MessageCircle className="w-8 h-8" />;
    case 'night': return <Shield className="w-8 h-8" />;
    default: return <Target className="w-8 h-8" />;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'adaptive': return 'from-violet-500 to-fuchsia-500';
    case 'highway': return 'from-blue-500 to-cyan-500';
    case 'city': return 'from-red-500 to-orange-500';
    case 'night': return 'from-emerald-500 to-teal-500';
    default: return 'from-brand-500 to-brand-400';
  }
};

export default function ChallengeFeedCard({ challenge, onPlay, onSkip }: Props) {
  return (
    <motion.div 
      className={`w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden shadow-2xl relative bg-secondary border border-subtle`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ height: '70vh', maxHeight: '600px' }}
    >
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${getColor(challenge.type)} pointer-events-none`} />
      
      <div className="p-8 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${getColor(challenge.type)} text-white shadow-lg`}>
            {getIcon(challenge.type)}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-black uppercase tracking-wider">
              {challenge.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              🔥 {challenge.bonus_multiplier}
            </span>
          </div>
        </div>

        <div className="mt-auto mb-8 text-left">
          <h2 className="text-3xl font-black text-primary uppercase italic mb-3 leading-tight">{challenge.title}</h2>
          <p className="text-muted text-base leading-relaxed">{challenge.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-primary/50 rounded-2xl p-4 border border-subtle backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Duration</span>
            </div>
            <p className="text-xl font-black text-primary">{challenge.duration_sec}s</p>
          </div>
          <div className="bg-primary/50 rounded-2xl p-4 border border-subtle backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Reward</span>
            </div>
            <p className="text-xl font-black text-brand-400">+{challenge.xp_reward} XP</p>
          </div>
        </div>

        <div className="flex gap-3">
          {onSkip && (
            <button 
              onClick={() => onSkip(challenge.id)}
              className="px-6 py-4 rounded-2xl font-bold text-muted bg-primary border border-subtle hover:bg-secondary transition-colors"
            >
              Skip
            </button>
          )}
          <button 
            onClick={() => onPlay(challenge.id)}
            className={`flex-1 py-4 rounded-2xl font-black text-white text-lg uppercase tracking-wider shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-gradient-to-br ${getColor(challenge.type)} hover:brightness-110 transition-all`}
          >
            PLAY NOW
          </button>
        </div>
      </div>
    </motion.div>
  );
}
