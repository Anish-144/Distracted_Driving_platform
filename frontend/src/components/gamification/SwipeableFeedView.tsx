import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChallengeFeedCard from './ChallengeFeedCard';
import { ChallengeFeedItem } from '@/api/gamification';

interface Props {
  challenges: ChallengeFeedItem[];
  onPlay: (id: string) => void;
}

export default function SwipeableFeedView({ challenges, onPlay }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSkip = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = offset.y;
    
    if (swipe < -50 && currentIndex < challenges.length - 1) {
      // Swiped up (next)
      setCurrentIndex((prev) => prev + 1);
    } else if (swipe > 50 && currentIndex > 0) {
      // Swiped down (previous)
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <h2 className="text-2xl font-black text-primary mb-2">You&apos;re All Caught Up</h2>
        <p className="text-muted">Check back later for new challenges.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden py-8">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={handleDragEnd}
          className="w-full flex justify-center px-4 cursor-grab active:cursor-grabbing"
        >
          <ChallengeFeedCard 
            challenge={challenges[currentIndex]} 
            onPlay={onPlay} 
            onSkip={currentIndex < challenges.length - 1 ? handleSkip : undefined}
          />
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 pointer-events-none">
        {challenges.map((_, idx) => (
          <div 
            key={idx} 
            className={`w-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'h-6 bg-brand-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]' : 'h-1.5 bg-subtle'}`}
          />
        ))}
      </div>
    </div>
  );
}
