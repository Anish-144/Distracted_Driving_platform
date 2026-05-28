/**
 * CoachingAudioCard — Premium card that renders post-session or lesson voice coaching.
 *
 * Fetches narration from the backend lazily (on user interaction or auto on mount).
 * Wraps VoicePlayer with context-specific visual styling.
 *
 * Uses:
 *  - /api/voice/post-session for post-simulation coaching
 *  - /api/voice/lesson for lesson narration
 *  - /api/voice/report for cognitive report executive summary
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Mic, Loader2, RefreshCw } from 'lucide-react';
import VoicePlayer from './VoicePlayer';
import {
  fetchPostSessionVoice,
  fetchReportVoice,
  fetchLessonVoice,
  VoiceNarrationResponse,
  PostSessionVoiceRequest,
  ReportVoiceRequest,
  LessonVoiceRequest,
} from '@/api/voice';

// ── Types ─────────────────────────────────────────────────────────────────────

type NarrationMode = 'post_session' | 'report' | 'lesson';

interface CoachingAudioCardProps {
  mode: NarrationMode;
  /** Auto-fetch narration on mount */
  autoFetch?: boolean;
  /** Auto-play when audio arrives */
  autoplay?: boolean;
  // Mode-specific payloads (only the relevant one is needed)
  postSessionPayload?: PostSessionVoiceRequest;
  reportPayload?: ReportVoiceRequest;
  lessonPayload?: LessonVoiceRequest;
}

// ── Mode Config ───────────────────────────────────────────────────────────────

const MODE_CONFIG = {
  post_session: {
    label: 'AI Behavioral Coaching',
    sublabel: 'Personalized session debrief',
    accentClass: 'text-brand-400',
    borderClass: 'border-l-brand-500',
    gradientClass: 'from-brand-500/5 to-transparent',
    icon: BrainCircuit,
  },
  report: {
    label: 'Report Narration',
    sublabel: 'Executive behavioral summary',
    accentClass: 'text-purple-400',
    borderClass: 'border-l-purple-500',
    gradientClass: 'from-purple-500/5 to-transparent',
    icon: BrainCircuit,
  },
  lesson: {
    label: 'Lesson Coaching',
    sublabel: 'Behavioral intervention narration',
    accentClass: 'text-amber-400',
    borderClass: 'border-l-amber-500',
    gradientClass: 'from-amber-500/5 to-transparent',
    icon: Mic,
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoachingAudioCard({
  mode,
  autoFetch = false,
  autoplay = false,
  postSessionPayload,
  reportPayload,
  lessonPayload,
}: CoachingAudioCardProps) {
  const [narration, setNarration] = useState<VoiceNarrationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;

  const fetchNarration = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: VoiceNarrationResponse;

      if (mode === 'post_session' && postSessionPayload) {
        result = await fetchPostSessionVoice(postSessionPayload);
      } else if (mode === 'report' && reportPayload) {
        result = await fetchReportVoice(reportPayload);
      } else if (mode === 'lesson' && lessonPayload) {
        result = await fetchLessonVoice(lessonPayload);
      } else {
        throw new Error('Missing payload for narration mode');
      }

      setNarration(result);
    } catch (err) {
      setError('Voice coaching temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [mode, postSessionPayload, reportPayload, lessonPayload]);

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (autoFetch) {
      fetchNarration();
    }
  }, [autoFetch, fetchNarration]);

  return (
    <div
      className={`card p-5 border-l-4 ${cfg.borderClass} bg-gradient-to-r ${cfg.gradientClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10`}
          >
            <Icon className={`w-3.5 h-3.5 ${cfg.accentClass}`} />
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${cfg.accentClass}`}>
              {cfg.label}
            </p>
            <p className="text-[10px] text-muted">{cfg.sublabel}</p>
          </div>
        </div>

        {/* Reload / fetch button */}
        {!autoFetch && !narration && !isLoading && (
          <button
            onClick={fetchNarration}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
              bg-white/5 border border-white/10 rounded-lg hover:bg-white/10
              transition-colors text-secondary"
          >
            <Mic className="w-3 h-3" />
            Play Narration
          </button>
        )}

        {narration && !isLoading && (
          <button
            onClick={fetchNarration}
            className="w-6 h-6 rounded flex items-center justify-center text-muted
              hover:text-primary transition-colors"
            title="Regenerate narration"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 py-4"
          >
            <Loader2 className={`w-4 h-4 animate-spin ${cfg.accentClass}`} />
            <p className="text-sm text-muted">Generating coaching narration…</p>
          </motion.div>
        )}

        {error && !isLoading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-3"
          >
            <p className="text-xs text-muted">{error}</p>
          </motion.div>
        )}

        {narration && !isLoading && (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <VoicePlayer
              audioB64={narration.audio_b64}
              text={narration.text}
              agentLabel="Coach"
              accentClass={cfg.accentClass}
              autoplay={autoplay}
            />
          </motion.div>
        )}

        {!narration && !isLoading && !error && autoFetch && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 flex items-center gap-2 text-muted text-xs"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Tap to generate personalized coaching narration</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
