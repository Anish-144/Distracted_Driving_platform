import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store';
import { Share2, RotateCcw, Home, Trophy, Skull, Zap, Download } from 'lucide-react';
import ReactConfetti from 'react-confetti';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  finalScore: number;
  xpEarned: number;
  onReplay: () => void;
  onHome: () => void;
}

export default function ReflexCardOverlay({ finalScore, xpEarned, onReplay, onHome }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { data: gData } = useAppSelector((state) => state.gamification);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isFlawless = finalScore >= 90;
  const isFailed = finalScore < 50;

  const gradeLabel = isFlawless ? 'S TIER' : finalScore >= 70 ? 'A TIER' : finalScore >= 50 ? 'B TIER' : 'F TIER';
  const gradeColor = isFlawless ? 'text-amber-400' : finalScore >= 70 ? 'text-emerald-400' : finalScore >= 50 ? 'text-blue-400' : 'text-red-500';

  const handleShare = async () => {
    if (isSharing || !cardRef.current) return;
    setIsSharing(true);
    try {
      // Dynamically import html2canvas to avoid SSR issues
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Try native share sheet first (mobile)
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'reflex-score.png', { type: 'image/png' });
          try {
            await navigator.share({ files: [file], title: 'My REFLEX Score', text: `I scored ${finalScore} on REFLEX! 🚗⚡` });
          } catch {
            // fallback to download
            downloadCanvas(canvas);
          }
        }, 'image/png');
      } else {
        downloadCanvas(canvas);
        toast.success('Score card saved! Share it anywhere 📸');
      }
    } catch (e) {
      toast.error('Could not generate share card');
    } finally {
      setIsSharing(false);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `reflex-score-${finalScore}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={400} gravity={0.15} />}

      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* ── The Card (captured by html2canvas) ── */}
        <motion.div
          ref={cardRef}
          className="relative w-full rounded-[2.5rem] overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
          initial={{ scale: 0.8, y: 100, rotateZ: -5 }}
          animate={{ scale: 1, y: 0, rotateZ: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/30 to-rose-600/30 mix-blend-overlay pointer-events-none" />

          <div className="relative z-10 p-8 flex flex-col items-center text-center">

            <motion.div
              className="mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: 'spring', delay: 0.3 }}
            >
              {isFlawless ? <Trophy className="w-20 h-20 text-amber-400" /> : isFailed ? <Skull className="w-20 h-20 text-red-500" /> : <Zap className="w-20 h-20 text-emerald-400" />}
            </motion.div>

            {/* Watermark branding for share */}
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">REFLEX · DISTRACTION TRAINING</p>
            <h3 className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mb-1">Session Grade</h3>
            <h1 className={`text-6xl font-black italic tracking-tighter mb-8 drop-shadow-lg ${gradeColor}`}>
              {gradeLabel}
            </h1>

            <div className="w-full grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/40 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-md">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Reflex Score</p>
                <p className="text-3xl font-black text-white">{finalScore}</p>
              </div>
              <div className="bg-black/40 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-md">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">XP Earned</p>
                <p className="text-3xl font-black text-violet-400">+{xpEarned}</p>
              </div>
            </div>

            <div className="w-full bg-slate-800/50 rounded-full py-2 px-4 flex items-center justify-between border border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class</span>
              <span className="text-sm font-black text-white uppercase tracking-wider">{gData?.driver_identity || 'Rookie'}</span>
            </div>

          </div>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Share button */}
          <motion.button
            onClick={handleShare}
            disabled={isSharing}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black uppercase tracking-widest shadow-lg hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSharing ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Save &amp; Share Score Card
              </>
            )}
          </motion.button>

          <div className="flex gap-3">
            <button
              onClick={onReplay}
              className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button
              onClick={onReplay}
              className="flex-1 h-16 rounded-2xl bg-white text-black font-black text-lg uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Run It Back
            </button>
            <button
              onClick={onHome}
              className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
