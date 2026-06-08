import client from './client';

export interface AchievementData {
  id: string;
  key: string;
  title: string;
  description: string;
  icon_key: string;
  xp_reward: number;
  category: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface DailyChallengeData {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  xp_reward: number;
  progress: number;
  completed: boolean;
}

export interface GamificationData {
  xp: number;
  level: number;
  level_progress_pct: number;
  next_level_xp: number;
  current_level_xp: number;
  driver_rank: string;
  driver_identity: string;
  current_streak: number;
  longest_streak: number;
  total_sessions_completed: number;
  total_xp_earned: number;
  achievements: AchievementData[];
  daily_challenge: DailyChallengeData | null;
  xp_to_next: number;
}

export interface FriendData {
  friendship_id: string;
  friend_user_id: string;
  friend_name: string;
  friend_rank: string;
  friend_level: number;
  friend_xp: number;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  challenge_active: boolean;
  is_requester: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  driver_rank: string;
  level: number;
  xp: number;
  current_streak: number;
  is_current_user: boolean;
}

export interface DailyCheckinResult {
  xp_awarded: number;
  current_streak: number;
  message: string;
}

export async function getMyGamification(): Promise<GamificationData> {
  const res = await client.get('/api/gamification/me');
  return res.data;
}

export async function dailyCheckin(): Promise<DailyCheckinResult> {
  const res = await client.post('/api/gamification/daily-checkin');
  return res.data;
}

export async function getXPLeaderboard(): Promise<{
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
  total_participants: number;
}> {
  const res = await client.get('/api/gamification/leaderboard');
  return res.data;
}

export async function getFriends(): Promise<FriendData[]> {
  const res = await client.get('/api/gamification/friends');
  return res.data;
}

export async function sendFriendRequest(email: string): Promise<{ message: string; friendship_id: string }> {
  const res = await client.post('/api/gamification/friends/request', { email });
  return res.data;
}

export async function acceptFriendRequest(friendship_id: string): Promise<{ message: string }> {
  const res = await client.post('/api/gamification/friends/accept', { friendship_id });
  return res.data;
}

export async function challengeFriend(friendship_id: string): Promise<{ message: string }> {
  const res = await client.post('/api/gamification/friends/challenge', { friendship_id });
  return res.data;
}

export async function removeFriend(friendship_id: string): Promise<{ message: string }> {
  const res = await client.delete(`/api/gamification/friends/${friendship_id}`);
  return res.data;
}
