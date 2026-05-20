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

// ── Psychological Metrics ─────────────────────────────────────────────────────

export interface PsychologicalMetrics {
  self_awareness_score: number;
  emotional_susceptibility_score: number;
  authority_pressure_index: number;
  cognitive_overload_score: number;
  behavioral_consistency_score: number;
  impulsiveness_mismatch_pct: number;
  attention_mismatch_pct: number;
  emotional_mismatch_pct: number;
  onboarding_profile_label: string;
  has_completed_assessment: boolean;
  total_simulations_since_assessment: number;
}

// ── AI Scenario Types ─────────────────────────────────────────────────────────

export interface GeneratedScenario {
  id: string;
  distraction_type: string;
  driver_profile_at_generation: string;
  difficulty_level: string;
  narrative_context: string;
  passenger_pressure_text: string;
  urgency_escalation_level: number;
  emotional_pressure_type: string;
  target_weakness: string;
  escalation_stage_1: string;
  escalation_stage_2: string;
  escalation_stage_3: string;
  ai_provider: string;
}

// ── Onboarding / Personality Types ───────────────────────────────────────────

export interface PersonalityProfile {
  onboarding_profile_label: string;
  impulsiveness_score: number;
  attention_control_score: number;
  emotional_reactivity_score: number;
  authority_compliance_score: number;
  cognitive_patience_score: number;
  risk_tolerance_score: number;
  stress_resilience_score: number;
  multitasking_tendency_score: number;
  consistency_score: number;
  self_awareness_score: number;
  has_completed_assessment: boolean;
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

/**
 * NEW: Get psychological intelligence metrics (requires completed onboarding).
 */
export async function fetchPsychologicalMetrics(): Promise<PsychologicalMetrics> {
  const res = await client.get<PsychologicalMetrics>('/ai/psychological/metrics');
  return res.data;
}

/**
 * NEW: Get the next AI-generated scenario for a given distraction type.
 * Auto-generates if no unused scenarios available.
 */
export async function fetchNextScenario(
  distractionType: string
): Promise<GeneratedScenario> {
  const res = await client.get<GeneratedScenario>(`/scenarios/next/${distractionType}`);
  return res.data;
}

/**
 * NEW: Generate a fresh AI scenario for the given type and session.
 */
export async function generateScenario(
  distractionType: string,
  sessionId?: string,
  difficulty: string = 'medium',
): Promise<GeneratedScenario> {
  const res = await client.post<GeneratedScenario>('/scenarios/generate', {
    distraction_type: distractionType,
    session_id: sessionId,
    difficulty_level: difficulty,
  });
  return res.data;
}

/**
 * NEW: Get the user's personality profile from onboarding assessment.
 */
export async function fetchPersonalityProfile(): Promise<PersonalityProfile> {
  const res = await client.get<PersonalityProfile>('/onboarding/profile/me');
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
