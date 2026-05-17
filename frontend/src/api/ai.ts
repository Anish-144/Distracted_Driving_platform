/**
 * AI Coaching API Client
 * Wraps /api/ai/* endpoints for the simulation pipeline.
 */
import client from './client';

// ── Request / Response Types ──────────────────────────────────────────────────

export interface PressureRequest {
  session_id: string;
  event_type: string;
  urgency?: 'low' | 'medium' | 'high';
  with_audio?: boolean;
}

export interface PressureResponse {
  agent: 'passenger';
  text: string;
  audio_b64: string | null;
  provider: string;
}

export interface FeedbackRequest {
  session_id: string;
  event_type: string;
  decision_type: string;
  response_time: number;
  score_delta: number;
  session_score: number;
  urgency?: 'low' | 'medium' | 'high';
  with_audio?: boolean;
}

export interface BehaviorState {
  dominant_pattern: string;
  behavior_summary: string;
  consecutive_mistakes: number;
  pressure_level: number;          // 0–3
  pressure_level_label: string;    // low | medium | high | critical
  safe_ratio: number;
  avg_reaction_time: number;
  dominant_fail_scenario: string;
}

export interface FeedbackResponse {
  agent: 'instructor' | 'authority';
  text: string;
  audio_b64: string | null;
  provider: string;
  behavior: BehaviorState;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Called when a distraction event STARTS.
 * Fetches passenger social pressure dialogue (+ optional audio).
 */
export async function fetchPressure(
  payload: PressureRequest
): Promise<PressureResponse> {
  const res = await client.post<PressureResponse>('/ai/pressure', payload);
  return res.data;
}

/**
 * Called AFTER the user makes a decision.
 * Returns instructor/authority coaching dialogue + behavioral state update.
 */
export async function fetchFeedback(
  payload: FeedbackRequest
): Promise<FeedbackResponse> {
  const res = await client.post<FeedbackResponse>('/ai/feedback', payload);
  return res.data;
}

/**
 * Get the current user's behavioral intelligence state.
 */
export async function fetchBehaviorState(): Promise<BehaviorState> {
  const res = await client.get<BehaviorState>('/ai/behavior/me');
  return res.data;
}

// ── Audio Utilities ───────────────────────────────────────────────────────────

/**
 * Convert a base64-encoded MP3 string into a playable Object URL.
 * Caller is responsible for calling URL.revokeObjectURL() when done.
 */
export function b64ToAudioUrl(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}
