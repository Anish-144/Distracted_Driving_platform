import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/store';
import { performEvolution } from '@/store/gamificationSlice';
import { Shield, Zap, Eye, Ghost, Star, ChevronsUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverClassCard() {
  const dispatch = useAppDispatch();
  const { data: gData, isLoading } = useAppSelector((state) => state.gamification);

  if (!gData) return null;

  const { driver_identity, class_tier, class_xp_progress, class_evolution_at } = gData;

  const getIdentityIcon = (identity: string) => {
    switch (identity.toLowerCase()) {
      case 'guardian': return <Shield className="w-12 h-12" />;
      case 'bolt': return <Zap className="w-12 h-12" />;
      case 'viper': return <Eye className="w-12 h-12" />;
      case 'phantom': return <Ghost className="w-12 h-12" />;
      case 'nova': return <Star className="w-12 h-12" />;
      default: return <Shield className="w-12 h-12" />;
    }
  };

  const getColor = (identity: string) => {
    switch (identity.toLowerCase()) {
      case 'guardian': return 'from-emerald-500 to-teal-500';
      case 'bolt': return 'from-brand-500 to-indigo-500';
      case 'viper': return 'from-rose-500 to-orange-500';
      case 'phantom': return 'from-slate-500 to-zinc-700';
      case 'nova': return 'from-amber-400 to-orange-500';
      default: return 'from-brand-500 to-brand-400';
    }
  };

  const progressPct = Math.min(100, Math.max(0, (class_xp_progress / class_evolution_at) * 100));
  const canEvolve = class_xp_progress >= class_evolution_at && class_tier < 3;

  const handleEvolve = async () => {
    try {
      await dispatch(performEvolution()).unwrap();
      toast.success('Evolution complete!');
    } catch (e: any) {
      toast.error(e || 'Evolution failed');
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-secondary border border-subtle shadow-xl w-full max-w-sm mx-auto`}>
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${getColor(driver_identity)} pointer-events-none`} />
      
      <div className="relative z-10 p-8 flex flex-col items-center text-center">
        <div className={`p-6 rounded-3xl bg-gradient-to-br ${getColor(driver_identity)} text-white shadow-2xl mb-6 transform rotate-3`}>
          {getIdentityIcon(driver_identity)}
        </div>
        
        <h2 className="text-3xl font-black text-primary uppercase italic tracking-tight">{driver_identity}</h2>
        <div className="flex items-center gap-2 mt-2 mb-8 text-brand-400">
          <span className="text-sm font-bold uppercase tracking-widest">Tier {class_tier}</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((t) => (
              <div key={t} className={`w-2 h-2 rounded-full ${t <= class_tier ? 'bg-brand-500' : 'bg-subtle'}`} />
            ))}
          </div>
        </div>

        {class_tier < 3 ? (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted uppercase tracking-wider">
              <span>Class XP</span>
              <span>{class_xp_progress} / {class_evolution_at}</span>
            </div>
            <div className="h-4 w-full bg-tertiary rounded-full overflow-hidden border border-subtle">
              <motion.div 
                className={`h-full bg-gradient-to-r ${getColor(driver_identity)}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-brand-400 font-black uppercase text-sm tracking-wider">
            MAX TIER REACHED
          </div>
        )}

        {canEvolve && (
          <motion.button
            onClick={handleEvolve}
            className="mt-6 w-full py-4 rounded-2xl bg-brand-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-400 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ChevronsUp className="w-5 h-5" />
            Evolve Now
          </motion.button>
        )}
      </div>
    </div>
  );
}
