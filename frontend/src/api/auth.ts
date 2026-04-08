import client from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
  email: string;
  profile_type: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_type: string;
  created_at: string;
}

/**
 * Login with email/password — returns JWT token + user info.
 * Uses OAuth2 form format (username = email).
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const response = await client.post<LoginResponse>('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

/**
 * Register a new user account.
 */
export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>('/api/auth/register', payload);
  return response.data;
}

/**
 * Get current authenticated user's profile.
 */
export async function getMe(): Promise<UserProfile> {
  const response = await client.get<UserProfile>('/api/auth/me');
  return response.data;
}
