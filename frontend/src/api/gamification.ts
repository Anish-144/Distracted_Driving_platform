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
  class_tier: number;
  class_xp_progress: number;
  class_evolution_at: number;
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
  const res = await client.get('/gamification/me');
  return res.data;
}

export async function dailyCheckin(): Promise<DailyCheckinResult> {
  const res = await client.post('/gamification/daily-checkin');
  return res.data;
}

export async function getXPLeaderboard(): Promise<{
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
  total_participants: number;
}> {
  const res = await client.get('/gamification/leaderboard');
  return res.data;
}

export async function getFriends(): Promise<FriendData[]> {
  const res = await client.get('/gamification/friends');
  return res.data;
}

export async function sendFriendRequest(email: string): Promise<{ message: string; friendship_id: string }> {
  const res = await client.post('/gamification/friends/request', { email });
  return res.data;
}

export async function acceptFriendRequest(friendship_id: string): Promise<{ message: string }> {
  const res = await client.post('/gamification/friends/accept', { friendship_id });
  return res.data;
}

export async function challengeFriend(friendship_id: string): Promise<{ message: string }> {
  const res = await client.post('/gamification/friends/challenge', { friendship_id });
  return res.data;
}

export async function removeFriend(friendship_id: string): Promise<{ message: string }> {
  const res = await client.delete(`/gamification/friends/${friendship_id}`);
  return res.data;
}

export interface ChallengeFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  duration_sec: number;
  xp_reward: number;
  difficulty: string;
  bonus_multiplier: string;
}

export async function getChallengeFeed(): Promise<ChallengeFeedItem[]> {
  const res = await client.get('/gamification/challenges/feed');
  return res.data;
}

export async function getBlitzChallenges(): Promise<ChallengeFeedItem[]> {
  const res = await client.get('/gamification/challenges/blitz');
  return res.data;
}

export async function evolveClass(): Promise<{ message: string; new_tier: number }> {
  const res = await client.post('/gamification/evolve');
  return res.data;
}

export interface ActiveEventItem {
  id: string;
  title: string;
  description: string;
  event_type: string;
  time_remaining_sec: number;
  reward_multiplier: number;
  difficulty_label: string;
}

export async function getActiveEvent(): Promise<ActiveEventItem | null> {
  const res = await client.get('/gamification/events/active');
  return res.data;
}

// ─── Daily Missions ──────────────────────────────────────────────────────────

export interface DailyMissionData {
  id: string;
  slot: number;
  title: string;
  description: string;
  mission_type: string;
  target_value: number;
  xp_reward: number;
  emoji: string;
  progress: number;
  completed: boolean;
}

export interface DailyMissionsResponse {
  missions: DailyMissionData[];
  all_completed: boolean;
  reset_at: string;
}

export async function getDailyMissions(): Promise<DailyMissionsResponse> {
  const res = await client.get('/missions/daily');
  return res.data;
}

export async function updateMissionProgress(missionId: string, increment: number = 1): Promise<{
  progress: number;
  completed: boolean;
  xp_awarded: number;
}> {
  const res = await client.post(`/missions/daily/${missionId}/progress?increment=${increment}`);
  return res.data;
}

// ─── Weekly Boss ─────────────────────────────────────────────────────────────

export interface WeeklyBossData {
  id: string;
  title: string;
  tagline: string;
  description: string;
  target_score: number;
  xp_reward: number;
  badge_key: string;
  difficulty: string;
  week_start: string;
  user_beaten: boolean;
  user_best_score: number;
  time_remaining_sec: number;
}

export async function getWeeklyBoss(): Promise<WeeklyBossData> {
  const res = await client.get('/missions/boss');
  return res.data;
}

export async function submitBossAttempt(bossId: string, score: number): Promise<{
  best_score: number;
  beaten: boolean;
  newly_beaten: boolean;
  xp_awarded: number;
}> {
  const res = await client.post(`/missions/boss/${bossId}/attempt?score=${score}`);
  return res.data;
}

export async function applyStreakFreeze(): Promise<{ message: string; tokens_remaining: number }> {
  const res = await client.post('/missions/streak/freeze');
  return res.data;
}
