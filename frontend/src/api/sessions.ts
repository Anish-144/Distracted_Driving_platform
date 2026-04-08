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

/**
 * Create a new simulation session for the current user.
 */
export async function createSession(): Promise<SessionData> {
  const response = await client.post<SessionData>('/api/session/create');
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
