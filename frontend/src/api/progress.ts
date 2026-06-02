import apiClient from './client';

export interface SessionTimelineEntry {
  session_id: string;
  timestamp: string;
  score: number;
  avg_reaction_time: number;
}

export interface ProgressStats {
  total_sessions: number;
  avg_score: number;
  improvement_rate: number;
  driver_type: string;
  ai_feedback: string;
  avg_reaction_time: number;
  percentile: number;
  mistakes: { scenario: string; response: string }[];
  timeline: SessionTimelineEntry[];
  lessons_completed: number;
  lesson_streak: number;
  lesson_completion_rate: number;
}

export const getMyProgress = async (): Promise<ProgressStats> => {
  const { data } = await apiClient.get<ProgressStats>('/progress/me');
  return data;
};
