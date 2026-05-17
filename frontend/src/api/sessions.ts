import client, { isRequestCancelled } from './client';

// Re-export so consumers only need to import from '@/api/sessions'
export { isRequestCancelled };

export interface SessionData {
  id: string;
  user_id: string;
  score: number;
  start_time: string;
  end_time: string | null;
}

export interface ScoreData {
  session_id: string;
  score: number;
  message: string;
}

export interface LatestSessionData {
  id: string | null;
  score: number;
  avg_reaction_time: number;
  driver_type: string;
  mistakes: { scenario: string; response: string }[];
}

/** Empty sentinel returned when a user has no sessions yet. */
export const EMPTY_SESSION: LatestSessionData = {
  id: null,
  score: 0,
  avg_reaction_time: 0,
  driver_type: 'Unknown',
  mistakes: [],
};

/**
 * Create a new simulation session for the current user.
 */
export async function createSession(): Promise<SessionData> {
  const response = await client.post<SessionData>('/session/create');
  return response.data;
}

/**
 * Fetch a session by ID.
 */
export async function getSession(sessionId: string): Promise<SessionData> {
  const response = await client.get<SessionData>(`/session/${sessionId}`);
  return response.data;
}

/**
 * End/close an active session.
 */
export async function endSession(sessionId: string): Promise<SessionData> {
  const response = await client.post<SessionData>(`/session/${sessionId}/end`);
  return response.data;
}

/**
 * Get current score for a session.
 */
export async function getSessionScore(sessionId: string): Promise<ScoreData> {
  const response = await client.get<ScoreData>(`/session/${sessionId}/score`);
  return response.data;
}

/**
 * Fetch the latest session for the dashboard.
 *
 * Accepts an optional AbortSignal so callers can cancel stale requests
 * (e.g. React Strict Mode double-invoke, unmount cleanup).
 *
 * Returns an EMPTY_SESSION sentinel for:
 *   - 404 (new user, no sessions yet)
 *   - 204 (no content)
 *
 * Re-throws only on genuine network/server failures.
 * Cancellation errors are re-thrown as-is so callers can detect and ignore them.
 */
export async function getLatestSession(signal?: AbortSignal): Promise<LatestSessionData> {
  try {
    const response = await client.get<LatestSessionData>('/session/latest', { signal });
    return response.data;
  } catch (err: any) {
    // Cancelled by AbortController — let it propagate so the caller can skip
    // state updates and toast. Do NOT treat this as an error.
    if (isRequestCancelled(err)) throw err;

    // 404 = user has no sessions yet. Treat as empty, not an error.
    // 204 = backend returned no content (equivalent to empty).
    if (err?.response?.status === 404 || err?.response?.status === 204) {
      return EMPTY_SESSION;
    }

    // 401 is handled by the Axios interceptor (redirect to login).
    // All other statuses (500, 502, network timeout) are genuine failures.
    throw err;
  }
}

/**
 * Mark a session as complete after simulation.
 */
export async function completeSession(sessionId: string): Promise<SessionData> {
  const response = await client.post<SessionData>(`/session/${sessionId}/complete`);
  return response.data;
}
