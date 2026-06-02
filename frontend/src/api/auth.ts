import client from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
  email: string;
  profile_type: string;
  is_admin: boolean;
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
  is_admin: boolean;
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

  const response = await client.post<LoginResponse>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

/**
 * Register a new user account.
 */
export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>('/auth/register', payload);
  return response.data;
}

/**
 * Get current authenticated user's profile.
 */
export async function getMe(): Promise<UserProfile> {
  const response = await client.get<UserProfile>('/auth/me');
  return response.data;
}

export interface UpdateCoreProfilePayload {
  name: string;
  email: string;
}

export interface UpdatePasswordPayload {
  current_password: string;
  new_password: string;
}

/**
 * Update current user's name and email.
 */
export async function updateCoreProfile(payload: UpdateCoreProfilePayload): Promise<{ status: string, name: string, email: string }> {
  const response = await client.patch('/users/profile', payload);
  return response.data;
}

/**
 * Update current user's password.
 */
export async function updatePassword(payload: UpdatePasswordPayload): Promise<{ status: string, message: string }> {
  const response = await client.patch('/users/password', payload);
  return response.data;
}

export interface ResetProgressResponse {
  success: boolean;
  cleared: string[];
  preserved: string[];
  profile_type_reset: string;
}

/**
 * Reset all training progress for the current user.
 * Clears: sessions, events, behavioral data, lessons, personality profiles.
 * Preserves: account, settings, feedback.
 * Also resets profile_type to 'unknown'.
 */
export async function resetProgress(): Promise<ResetProgressResponse> {
  const response = await client.post<ResetProgressResponse>('/users/reset-progress');
  return response.data;
}



/**
 * Permanently delete the current user's account and all associated data.
 * The caller is responsible for clearing auth state after this resolves.
 */
export async function deleteAccount(): Promise<{ success: boolean }> {
  const response = await client.delete<{ success: boolean }>('/users/me');
  return response.data;
}

/**
 * Export the current user's data as a downloadable JSON file.
 *
 * Requests GET /api/users/export with responseType: 'blob' so Axios
 * returns the raw binary payload without parsing it. Creates a temporary
 * object URL and programmatically triggers a download anchor so the browser
 * saves the file without any page navigation.
 *
 * @returns filename — the name of the file that was downloaded
 */
export async function exportMyData(): Promise<string> {
  const response = await client.get('/users/export', {
    responseType: 'blob',
  });

  // Extract filename from Content-Disposition header if present
  const disposition: string = response.headers['content-disposition'] ?? '';
  let filename = `safedrive_export_${new Date().toISOString().slice(0, 10)}.json`;
  const match = disposition.match(/filename="?([^";\s]+)"?/);
  if (match?.[1]) {
    filename = match[1];
  }

  // Create an object URL from the blob and trigger a native browser download
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up immediately — the download is already queued by the browser
  anchor.remove();
  URL.revokeObjectURL(url);

  return filename;
}


