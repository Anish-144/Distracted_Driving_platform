import client from './client';

export type EventType =
  | 'incoming_call'
  | 'whatsapp_notification'
  | 'gps_rerouting'
  | 'email_alert'
  | 'social_media';

export type UserResponseType = 'ignored' | 'interacted' | 'voice_command' | 'no_response';

export interface PostEventPayload {
  session_id: string;
  event_type: EventType;
  user_response: UserResponseType;
  response_time: number; // seconds
  notes?: string;
}

export interface EventResult {
  id: string;
  session_id: string;
  event_type: string;
  user_response: string;
  response_time: number | null;
  decision_type: string;
  score_delta: number;
  new_score: number;
  triggered_at: string;
}

/**
 * Post a user's response to a distraction event.
 * Returns the evaluation result including score delta and decision type.
 */
export async function postEvent(payload: PostEventPayload): Promise<EventResult> {
  const response = await client.post<EventResult>('/event', payload);
  return response.data;
}

/**
 * Fetch a specific event record.
 */
export async function getEvent(eventId: string): Promise<EventResult> {
  const response = await client.get<EventResult>(`/api/event/${eventId}`);
  return response.data;
}
