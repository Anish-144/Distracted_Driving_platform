import apiClient from './client';

// ── Static Lesson (existing) ──────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tag: string;
}

export const getRecommendedLessons = async (): Promise<Lesson[]> => {
  const { data } = await apiClient.get<Lesson[]>('/lessons/recommended');
  return data;
};

export const getAllLessons = async (): Promise<Lesson[]> => {
  const { data } = await apiClient.get<Lesson[]>('/lessons');
  return data;
};

// ── AI-Generated Lessons ──────────────────────────────────────────────────────

export interface AILesson {
  id: string;
  title: string;
  behavioral_target: string;
  why_it_matters: string;
  ai_coaching_advice: string;
  exercises: string[];
  personalized_insight: string;
  improvement_goal: string;
  simulation_modes: string[];
  difficulty: string;
  driver_type: string;
  reaction_time_target: number;
  distraction_tolerance_target: number;
  ai_provider: string;
  completed: boolean;
  completion_score: number | null;
  completed_at: string | null;
  created_at: string;
  session_id: string | null;
  generated_reason: string | null;
  recommended_focus: string | null;
  simulation_source?: string | null;
  mistake_trigger?: string | null;
  risk_level?: string | null;
}

export const getAIRecommendedLessons = async (): Promise<AILesson[]> => {
  const { data } = await apiClient.get<AILesson[]>('/lessons/ai/recommended');
  return data;
};

export const getAILessonHistory = async (): Promise<AILesson[]> => {
  const { data } = await apiClient.get<AILesson[]>('/lessons/ai/history');
  return data;
};

export const generateAILesson = async (): Promise<AILesson> => {
  const { data } = await apiClient.post<AILesson>('/lessons/ai/generate');
  return data;
};

export const generateAILessonFromSession = async (sessionId: string): Promise<AILesson> => {
  const { data } = await apiClient.post<AILesson>(`/lessons/generate-from-session/${sessionId}`);
  return data;
};

export const completeAILesson = async (lessonId: string, completionScore: number = 100): Promise<AILesson> => {
  const { data } = await apiClient.post<AILesson>(`/lessons/ai/${lessonId}/complete`, {
    completion_score: completionScore,
  });
  return data;
};
