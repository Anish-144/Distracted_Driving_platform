/**
 * SimulationVoiceOverlay — Compact floating voice playback for real-time simulation audio.
 *
 * This component reads from the existing Redux `ai` slice (audioUrl / isPlaying)
 * which is already populated by AIDialogue.tsx. It does NOT duplicate Redux state.
 * It provides a floating "Now Playing" badge that appears when AI audio is playing
 * during simulation — giving an immersive voice coaching indicator without
 * interfering with the simulation event UI.
 *
 * Architecture safety:
 *  - Read-only from aiSlice — dispatches only audioStarted / audioEnded
 *  - Does NOT duplicate the audio element from AIDialogue (that component owns playback)
 *  - Only renders when simulation is active (isSimulating = true in sessionSlice)
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store';
import { Mic, Volume2 } from 'lucide-react';

// ── Agent style config (mirrors AIDialogue.tsx visual identity) ───────────────

const AGENT_BADGES = {
  passenger: {
    label: 'Passenger',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
  },
  instructor: {
    label: 'Instructor',
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
  },
  authority: {
    label: 'Authority',
    dotColor: 'bg-red-500',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulationVoiceOverlay() {
  const { isPlaying, activeMessage, enabled } = useAppSelector((s) => s.ai);
  const { isSimulating } = useAppSelector((s) => s.session);

  // Don't render outside simulation or when AI is disabled
  if (!isSimulating || !enabled) return null;

  const agent = activeMessage?.agent ?? null;
  const badgeCfg = agent && agent in AGENT_BADGES
    ? AGENT_BADGES[agent as keyof typeof AGENT_BADGES]
    : null;

  return (
    <AnimatePresence>
      {isPlaying && badgeCfg && (
        <motion.div
          key="voice-overlay"
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`
            fixed top-4 right-4 z-50
            flex items-center gap-2 px-3 py-2 rounded-xl
            backdrop-blur-md border
            ${badgeCfg.bgColor} ${badgeCfg.borderColor}
          `}
        >
          {/* Animated voice waveform */}
          <div className="flex items-center gap-0.5 h-4">
            {[0, 0.1, 0.2, 0.1, 0].map((delay, i) => (
              <motion.span
                key={i}
                className={`w-0.5 rounded-full ${badgeCfg.dotColor}`}
                animate={{ height: [3, 10 + (i === 2 ? 4 : 0), 3] }}
                transition={{ duration: 0.55, delay, repeat: Infinity, ease: 'easeInOut' }}
                style={{ height: 3 }}
              />
            ))}
          </div>

          {/* Agent label */}
          <span className={`text-[10px] font-bold uppercase tracking-wider ${badgeCfg.textColor}`}>
            {badgeCfg.label}
          </span>

          {/* Volume icon */}
          <Volume2 className={`w-3 h-3 ${badgeCfg.textColor}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
