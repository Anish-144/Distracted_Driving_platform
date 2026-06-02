import client from './client';

export type FeedbackType = 'bug' | 'feature' | 'ux' | 'general' | 'simulation';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'archived';
export type FeedbackPriority = 'low' | 'medium' | 'high';

export interface FeedbackAttachment {
  id: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

export interface FeedbackNote {
  id: string;
  admin_id: string | null;
  content: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  rating: number | null;
  comment: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  page_url: string | null;
  browser: string | null;
  device_type: string | null;
  screen_size: string | null;
  user_agent: string | null;
  app_version: string | null;
  created_at: string;
  updated_at: string;
  attachments: FeedbackAttachment[];
  notes?: FeedbackNote[]; // Only available to admin
}

export interface FeedbackListResponse {
  items: Feedback[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface FeedbackAnalyticsResponse {
  total_feedback: number;
  open_issues: number;
  resolved_issues: number;
  avg_rating: number;
  type_counts: Record<string, number>;
  status_counts: Record<string, number>;
}

export async function submitFeedback(data: FormData): Promise<Feedback> {
  const res = await client.post<Feedback>('/feedback', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getAdminFeedback(params: { limit: number; offset: number; status?: string; type?: string }): Promise<FeedbackListResponse> {
  const res = await client.get<FeedbackListResponse>('/feedback/admin', { params });
  return res.data;
}

export async function getAdminFeedbackDetail(id: string): Promise<Feedback> {
  const res = await client.get<Feedback>(`/feedback/admin/${id}`);
  return res.data;
}

export async function updateFeedbackStatus(id: string, status?: FeedbackStatus, priority?: FeedbackPriority): Promise<Feedback> {
  const res = await client.patch<Feedback>(`/feedback/admin/${id}`, { status, priority });
  return res.data;
}

export async function addFeedbackNote(id: string, content: string): Promise<Feedback> {
  const res = await client.post<Feedback>(`/feedback/admin/${id}/notes`, { content });
  return res.data;
}

export async function getFeedbackAnalytics(): Promise<FeedbackAnalyticsResponse> {
  const res = await client.get<FeedbackAnalyticsResponse>('/feedback/admin/analytics');
  return res.data;
}

export async function getFeedbackAIInsights(): Promise<{ insights?: string; summary?: string; analyzed_count?: number; cached_at?: string; error?: string }> {
  const res = await client.get('/feedback/admin/ai-insights');
  return res.data;
}

export async function regenerateFeedbackAIInsights(): Promise<{ insights?: string; summary?: string; analyzed_count?: number; cached_at?: string; error?: string }> {
  const res = await client.post('/feedback/admin/ai-insights/regenerate');
  return res.data;
}
