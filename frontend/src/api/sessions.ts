import client from './client';

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
  const response = await client.get<SessionData>(`/api/session/${sessionId}`);
  return response.data;
}

/**
 * End/close an active session.
 */
export async function endSession(sessionId: string): Promise<SessionData> {
  const response = await client.post<SessionData>(`/api/session/${sessionId}/end`);
  return response.data;
}

/**
 * Get current score for a session.
 */
export async function getSessionScore(sessionId: string): Promise<ScoreData> {
  const response = await client.get<ScoreData>(`/api/session/${sessionId}/score`);
  return response.data;
}

/**
 * Fetch the latest session for the dashboard.
 */
export async function getLatestSession(): Promise<LatestSessionData> {
  const response = await client.get<LatestSessionData>('/session/latest');
  return response.data;
}

/**
 * Mark a session as complete after simulation.
 */
export async function completeSession(sessionId: string): Promise<SessionData> {
  const response = await client.post<SessionData>(`/api/session/${sessionId}/complete`);
  return response.data;
}
