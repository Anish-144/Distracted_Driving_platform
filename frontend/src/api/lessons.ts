import apiClient from './client';

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
