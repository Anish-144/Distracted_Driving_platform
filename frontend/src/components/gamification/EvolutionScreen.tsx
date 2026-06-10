import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsUp, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearEvolutionEvent } from '@/store/gamificationSlice';
import ReactConfetti from 'react-confetti';

export default function EvolutionScreen() {
  const dispatch = useAppDispatch();
  const { evolutionEvent, data: gData } = useAppSelector((state) => state.gamification);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (evolutionEvent) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [evolutionEvent]);

  if (!evolutionEvent || !gData) return null;

  const { oldTier, newTier } = evolutionEvent;
  const { driver_identity } = gData;

  const handleClose = () => {
    dispatch(clearEvolutionEvent());
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/90 backdrop-blur-md px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {showConfetti && <ReactConfetti recycle={false} numberOfPieces={500} gravity={0.2} />}

        <motion.div
          className="relative max-w-sm w-full bg-secondary border border-brand-500/50 rounded-[3rem] p-8 text-center shadow-[0_0_100px_rgba(139,92,246,0.3)]"
          initial={{ scale: 0.8, y: 50, rotateX: 45 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-muted hover:text-white transition-colors border border-subtle z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div 
            className="mx-auto w-24 h-24 bg-brand-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(139,92,246,0.8)]"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <ChevronsUp className="w-12 h-12 text-white" />
          </motion.div>

          <h2 className="text-sm font-black text-brand-400 uppercase tracking-widest mb-2">Evolution Complete</h2>
          <h1 className="text-4xl font-black text-primary italic uppercase mb-6 leading-none">
            {driver_identity}
            <br />
            Tier {newTier}
          </h1>

          <p className="text-muted text-lg mb-8 leading-relaxed">
            Your reflexes are sharper. Your focus is unbreakable. You&apos;ve reached a new level of mastery.
          </p>

          <button
            onClick={handleClose}
            className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
