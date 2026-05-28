import apiClient from './client';

export interface UserSettings {
  lesson_reminders: boolean;
  weekly_progress: boolean;
  coaching_recommendations: boolean;
  assessment_reminders: boolean;
  email_notifications: boolean;
  difficulty: string;
  intensity: string;
  audio_guidance: boolean;
  phone: string | null;
  emergency_contact: string | null;
}

export type UserSettingsUpdate = Partial<UserSettings>;

export const fetchSettings = async (): Promise<UserSettings> => {
  const response = await apiClient.get('/settings');
  return response.data;
};

export const updateSettings = async (settings: UserSettingsUpdate): Promise<UserSettings> => {
  const response = await apiClient.patch('/settings', settings);
  return response.data;
};
