import apiClient from './client';

export interface ProgressStats {
  total_sessions: number;
  avg_score: number;
  improvement_rate: number;
  driver_type: string;
  ai_feedback: string;
  avg_reaction_time: number;
  mistakes: { scenario: string; response: string }[];
}

export const getMyProgress = async (): Promise<ProgressStats> => {
  const { data } = await apiClient.get<ProgressStats>('/progress/me');
  return data;
};
