/**
 * Voice Narration API Client
 * Wraps /api/voice/* endpoints for post-session coaching,
 * report narration, and lesson narration.
 */
import client from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceNarrationResponse {
  text: string;
  audio_b64: string | null;
  provider: string;
  narration_type: string;
  available: boolean;
}

export interface PostSessionVoiceRequest {
  session_id: string;
  session_score: number;
  with_audio?: boolean;
}

export interface ReportVoiceRequest {
  driver_type: string;
  personality_label: string;
  safe_decision_rate: number;
  executive_summary: string;
  with_audio?: boolean;
}

export interface LessonVoiceRequest {
  title: string;
  lesson_category: string;
  driver_type: string;
  behavioral_diagnosis: string;
  psychological_interpretation: string;
  with_audio?: boolean;
}

// ── Audio Utilities ───────────────────────────────────────────────────────────

/**
 * Convert a base64-encoded MP3 to a playable Object URL.
 * Caller MUST call URL.revokeObjectURL() when done to prevent memory leaks.
 */
export function narrationB64ToUrl(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Generate adaptive coaching narration after a simulation session.
 * Pulls behavioral state server-side for personalization.
 */
export async function fetchPostSessionVoice(
  payload: PostSessionVoiceRequest
): Promise<VoiceNarrationResponse> {
  const res = await client.post<VoiceNarrationResponse>('/voice/post-session', payload);
  return res.data;
}

/**
 * Generate spoken executive summary narration for a cognitive report.
 */
export async function fetchReportVoice(
  payload: ReportVoiceRequest
): Promise<VoiceNarrationResponse> {
  const res = await client.post<VoiceNarrationResponse>('/voice/report', payload);
  return res.data;
}

/**
 * Generate spoken narration for an AI-generated lesson.
 */
export async function fetchLessonVoice(
  payload: LessonVoiceRequest
): Promise<VoiceNarrationResponse> {
  const res = await client.post<VoiceNarrationResponse>('/voice/lesson', payload);
  return res.data;
}
