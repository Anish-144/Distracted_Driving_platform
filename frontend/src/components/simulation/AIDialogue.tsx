/**
 * AIDialogue — Real-time AI coaching overlay for the simulation.
 *
 * Renders the active AI agent's spoken line with:
 *  - Agent identity badge (Passenger / Instructor / Authority)
 *  - Spoken text with typewriter reveal
 *  - Audio playback indicator
 *  - Pressure-level visual escalation
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/store';
import { audioStarted, audioEnded, aiCleared } from '@/store/aiSlice';
import { Mic, Shield, User, AlertTriangle, Volume2, VolumeX, Loader2 } from 'lucide-react';

// ── Agent Config ──────────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  passenger: {
    label: 'Passenger',
    icon: User,
    bgClass: 'bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    textClass: 'text-amber-900',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  instructor: {
    label: 'Instructor',
    icon: Shield,
    bgClass: 'bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    textClass: 'text-emerald-900',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-400',
  },
  authority: {
    label: 'Authority',
    icon: AlertTriangle,
    bgClass: 'bg-red-50 border-red-200',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    textClass: 'text-red-900',
    iconColor: 'text-red-600',
    dot: 'bg-red-500',
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIDialogue() {
  const dispatch = useAppDispatch();
  const { activeMessage, isLoading, isPlaying, enabled } = useAppSelector((s) => s.ai);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // ── Typewriter effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeMessage?.text) {
      setDisplayedText('');
      return;
    }
    setDisplayedText('');
    let i = 0;
    const chars = activeMessage.text.split('');
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + chars[i]);
      i++;
      if (i >= chars.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [activeMessage?.text, activeMessage?.timestamp]);

  // ── Audio playback ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeMessage?.audioUrl || isMuted) return;

    const audio = new Audio(activeMessage.audioUrl);
    audioRef.current = audio;

    dispatch(audioStarted());
    audio.play().catch(() => {
      // Autoplay blocked — user needs to interact first
      dispatch(audioEnded());
    });

    audio.onended = () => {
      dispatch(audioEnded());
      audioRef.current = null;
    };

    return () => {
      audio.pause();
      audioRef.current = null;
      dispatch(audioEnded());
    };
  }, [activeMessage?.audioUrl, activeMessage?.timestamp, isMuted, dispatch]);

  // ── Auto-dismiss after 6s if no audio ───────────────────────────────────────
  useEffect(() => {
    if (!activeMessage || activeMessage.audioUrl) return;
    const t = setTimeout(() => dispatch(aiCleared()), 6000);
    return () => clearTimeout(t);
  }, [activeMessage, dispatch]);

  if (!enabled) return null;

  const agentKey = (activeMessage?.agent ?? null) as keyof typeof AGENT_CONFIG | null;
  const config = agentKey ? AGENT_CONFIG[agentKey] : null;

  return (
    <div className="w-full">
      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-gray-400 mb-2 px-1"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>AI coach analyzing…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active dialogue card */}
      <AnimatePresence mode="wait">
        {activeMessage && config && (
          <motion.div
            key={activeMessage.timestamp}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-xl border p-3.5 flex items-start gap-3 ${config.bgClass}`}
          >
            {/* Agent icon */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${config.badgeClass}`}>
              <config.icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${config.iconColor}`}>
                    {config.label}
                  </span>
                  {/* Pulse when playing */}
                  {isPlaying && (
                    <span className="flex gap-0.5 items-center">
                      {[0, 0.1, 0.2].map((d) => (
                        <motion.span
                          key={d}
                          className={`w-0.5 rounded-full ${config.dot}`}
                          animate={{ height: ['4px', '10px', '4px'] }}
                          transition={{ duration: 0.6, delay: d, repeat: Infinity }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                {/* Mute toggle */}
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={isMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {isMuted
                    ? <VolumeX className="w-3.5 h-3.5" />
                    : <Volume2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>

              {/* Dialogue text with typewriter */}
              <p className={`text-sm font-medium leading-snug ${config.textClass}`}>
                {displayedText}
                <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle opacity-60" />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
