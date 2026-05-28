/**
 * VoicePlayer — Core reusable audio playback component.
 *
 * Handles:
 *  - Base64 audio → Object URL conversion with cleanup
 *  - Play / Pause toggle
 *  - Replay button
 *  - Progress visualization
 *  - Mobile-safe autoplay (requires user gesture first)
 *  - Mute state
 *
 * This is the atomic playback primitive used by CoachingAudioCard
 * and SimulationVoiceOverlay. It does NOT contain business logic.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Mic } from 'lucide-react';
import { narrationB64ToUrl } from '@/api/voice';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VoicePlayerProps {
  /** Base64-encoded MP3 audio. Null renders text-only fallback. */
  audioB64: string | null;
  /** Display text (shown alongside or instead of audio) */
  text: string;
  /** Agent label shown in the badge */
  agentLabel?: string;
  /** Color accent class — passed as Tailwind text color (e.g., 'text-brand-400') */
  accentClass?: string;
  /** Whether to autoplay when audio loads */
  autoplay?: boolean;
  /** Whether the player is in a compact mode (simulation overlay) */
  compact?: boolean;
  /** Called when audio ends */
  onEnded?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoicePlayer({
  audioB64,
  text,
  agentLabel = 'Coach',
  accentClass = 'text-brand-400',
  autoplay = false,
  compact = false,
  onEnded,
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canAutoplay, setCanAutoplay] = useState(false);

  // Convert b64 → Object URL once when audioB64 changes
  useEffect(() => {
    // Revoke previous URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);

    if (!audioB64) return;

    const url = narrationB64ToUrl(audioB64);
    objectUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);

    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(1);
      onEnded?.();
    };

    audio.onerror = () => setIsPlaying(false);

    // Attempt autoplay — browsers may block without prior interaction
    if (autoplay) {
      audio.play()
        .then(() => { setIsPlaying(true); setCanAutoplay(true); })
        .catch(() => {
          // Autoplay blocked — show play button instead
          setCanAutoplay(false);
        });
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioB64, autoplay, onEnded]);

  // Sync mute state to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
    setProgress(0);
  }, []);

  const hasAudio = Boolean(audioB64);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {hasAudio && (
          <>
            <button
              onClick={togglePlay}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200
                bg-white/5 border border-white/10 hover:bg-white/10 ${accentClass}`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying
                ? <Pause className="w-3.5 h-3.5" />
                : <Play className="w-3.5 h-3.5 ml-0.5" />
              }
            </button>
            {/* Compact waveform */}
            <div className="flex items-center gap-0.5 h-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`w-0.5 rounded-full ${isPlaying ? accentClass.replace('text-', 'bg-') : 'bg-white/20'}`}
                  animate={isPlaying ? { height: [3, 10 + (i % 3) * 4, 3] } : { height: 3 }}
                  transition={{ duration: 0.5 + (i * 0.07), repeat: Infinity, ease: 'easeInOut' }}
                  style={{ height: 3 }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Text display */}
      <p className="text-sm text-secondary leading-relaxed mb-4 italic">
        &ldquo;{text}&rdquo;
      </p>

      {hasAudio ? (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${accentClass.replace('text-', 'bg-')}`}
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Duration */}
            <span className="text-[10px] text-muted font-mono">
              {duration > 0 ? `${Math.round(duration)}s` : '--'}
            </span>

            {/* Play / Pause + Replay */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReplay}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted
                  hover:text-primary transition-colors bg-white/5 border border-white/10 hover:bg-white/10"
                title="Replay"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                  bg-white/10 border border-white/15 hover:bg-white/15 ${accentClass}`}
                title={isPlaying ? 'Pause' : 'Play narration'}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isPlaying ? 'pause' : 'play'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isPlaying
                      ? <Pause className="w-4 h-4" />
                      : <Play className="w-4 h-4 ml-0.5" />
                    }
                  </motion.span>
                </AnimatePresence>
              </button>

              <button
                onClick={() => setIsMuted((m) => !m)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted
                  hover:text-primary transition-colors bg-white/5 border border-white/10 hover:bg-white/10"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted
                  ? <VolumeX className="w-3 h-3" />
                  : <Volume2 className="w-3 h-3" />
                }
              </button>
            </div>

            {/* Waveform animation */}
            <div className="flex items-center gap-0.5 h-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`w-0.5 rounded-full ${
                    isPlaying
                      ? accentClass.replace('text-', 'bg-')
                      : 'bg-white/20'
                  }`}
                  animate={isPlaying ? { height: [3, 12 + (i % 3) * 4, 3] } : { height: 3 }}
                  transition={{ duration: 0.5 + (i * 0.08), repeat: Infinity, ease: 'easeInOut' }}
                  style={{ height: 3 }}
                />
              ))}
            </div>
          </div>

          {/* Autoplay blocked notice */}
          {!canAutoplay && !isPlaying && autoplay && (
            <p className="text-[10px] text-muted text-center">
              Tap play to hear coaching narration
            </p>
          )}
        </div>
      ) : (
        /* Text-only fallback when TTS unavailable */
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Mic className="w-3 h-3" />
          <span>Voice coaching unavailable — reading mode active</span>
        </div>
      )}
    </div>
  );
}
