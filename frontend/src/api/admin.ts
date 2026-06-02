import client from './client';

export interface PlatformKPIs {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_sessions_completed: number;
  total_lessons_completed: number;
  average_safety_score: number;
  average_reaction_time: number;
  open_feedback_issues: number;
  resolved_feedback_issues: number;
  average_feedback_rating: number;
}

export interface DriverLeader {
  rank?: number;
  id: string;
  name: string;
  average_score: number;
  sessions_completed?: number;
  risk_classification?: string;
  intervention_count?: number;
}

export interface Leaderboards {
  top_drivers: DriverLeader[];
  high_risk_drivers: DriverLeader[];
}

export interface BehavioralDistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface TrainingEffectiveness {
  average_score_before_lessons: number;
  average_score_after_lessons: number;
  improvement_percentage: number;
  lesson_completion_rate: number;
  generated_lessons: number;
  completed_lessons: number;
}

export interface AIPlatformInsights {
  summary: string;
  key_trends: string[];
  action_items: string[];
  error?: string;
  cached_at?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  profile_type: string;
  sessions: number;
  average_score: number;
  last_active?: string;
  created_at?: string;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total_count: number;
  limit: number;
  offset: number;
}

// ----------------- KPI / Platform Endpoints -----------------

export async function getPlatformKPIs(): Promise<PlatformKPIs> {
  const res = await client.get<PlatformKPIs>('/admin/kpis');
  return res.data;
}

export async function getLeaderboards(): Promise<Leaderboards> {
  const res = await client.get<Leaderboards>('/admin/leaderboard');
  return res.data;
}

export async function getBehavioralDistribution(): Promise<{ distribution: BehavioralDistributionItem[] }> {
  const res = await client.get<{ distribution: BehavioralDistributionItem[] }>('/admin/behavioral-distribution');
  return res.data;
}

export async function getTrainingEffectiveness(): Promise<TrainingEffectiveness> {
  const res = await client.get<TrainingEffectiveness>('/admin/training-effectiveness');
  return res.data;
}

export async function getPlatformAIInsights(): Promise<AIPlatformInsights> {
  const res = await client.get<AIPlatformInsights>('/admin/ai-insights');
  return res.data;
}

export async function regeneratePlatformAIInsights(): Promise<AIPlatformInsights> {
  const res = await client.post<AIPlatformInsights>('/admin/ai-insights/regenerate');
  return res.data;
}

// ----------------- Users Management Endpoints -----------------

export async function getAdminUsers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  profile_type?: string;
}): Promise<AdminUsersResponse> {
  const res = await client.get<AdminUsersResponse>('/admin/users', { params });
  return res.data;
}

export async function getAdminUserDetail(id: string): Promise<AdminUser> {
  const res = await client.get<AdminUser>(`/admin/users/${id}`);
  return res.data;
}

export async function updateAdminUserRole(id: string, is_admin: boolean): Promise<{ message: string; is_admin: boolean }> {
  const res = await client.patch<{ message: string; is_admin: boolean }>(`/admin/users/${id}/role`, null, {
    params: { is_admin },
  });
  return res.data;
}
