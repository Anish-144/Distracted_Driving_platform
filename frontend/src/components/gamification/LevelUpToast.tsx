import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearLevelUpEvent } from '@/store/gamificationSlice';

// ─── Sound Manager ────────────────────────────────────────────────────────────
// Generates sounds using Web Audio API — no external assets needed.

function createAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

export function playSound(type: 'xp' | 'levelup' | 'achievement' | 'checkin'): void {
  const ctx = createAudioCtx();
  if (!ctx) return;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  const scheduleNote = (freq: number, start: number, dur: number, vol = 0.15) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(gain);
    osc.frequency.value = freq;
    osc.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  };

  if (type === 'xp') {
    scheduleNote(523.25, 0, 0.08, 0.08);   // C5
    scheduleNote(659.25, 0.07, 0.1, 0.08); // E5
  } else if (type === 'levelup') {
    // Triumphant arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      scheduleNote(f, i * 0.1, 0.25, 0.12);
    });
  } else if (type === 'achievement') {
    scheduleNote(880, 0, 0.12, 0.1);
    scheduleNote(1108.73, 0.1, 0.15, 0.1);
    scheduleNote(1318.51, 0.22, 0.25, 0.08);
  } else if (type === 'checkin') {
    scheduleNote(440, 0, 0.1, 0.08);
    scheduleNote(554.37, 0.09, 0.12, 0.08);
  }
}

// ─── Level-Up Overlay ─────────────────────────────────────────────────────────

export default function LevelUpToast() {
  const dispatch = useAppDispatch();
  const levelUpEvent = useAppSelector(s => s.gamification.levelUpEvent);
  const played = useRef(false);

  useEffect(() => {
    if (levelUpEvent && !played.current) {
      played.current = true;
      playSound('levelup');
      const t = setTimeout(() => {
        dispatch(clearLevelUpEvent());
        played.current = false;
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [levelUpEvent, dispatch]);

  return (
    <AnimatePresence>
      {levelUpEvent && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Radial burst */}
          <motion.div
            className="absolute"
            style={{
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 2.5, 2] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.div
            className="relative flex flex-col items-center gap-3 px-10 py-8 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(20,15,40,0.95), rgba(30,20,60,0.95))',
              border: '1.5px solid rgba(139,92,246,0.5)',
              boxShadow: '0 0 60px rgba(139,92,246,0.4), 0 24px 48px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
          >
            {/* Stars burst */}
            {['★','★','★','✦','✦'].map((s, i) => (
              <motion.span
                key={i}
                className="absolute text-yellow-400 font-bold"
                style={{ fontSize: i % 2 === 0 ? 18 : 12 }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos((i / 5) * Math.PI * 2) * 80,
                  y: Math.sin((i / 5) * Math.PI * 2) * 60,
                  opacity: 0,
                  scale: [0, 1.5, 0],
                }}
                transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
              >
                {s}
              </motion.span>
            ))}

            <motion.div
              style={{ fontSize: 52, lineHeight: 1 }}
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              🏆
            </motion.div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 4 }}>
                Level Up!
              </p>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                Level {levelUpEvent.newLevel}
              </p>
              <p style={{ fontSize: 14, color: '#c4b5fd', marginTop: 4, fontWeight: 600 }}>
                {levelUpEvent.rank}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
