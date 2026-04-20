import client from './client';

export interface UpdateProfileResponse {
  status: string;
  profile_type: string;
}

/**
 * Update the user's behavioral profile type.
 */
export async function updateProfile(profileType: string): Promise<UpdateProfileResponse> {
  const response = await client.patch<UpdateProfileResponse>('/users/me/profile', {
    profile_type: profileType,
  });
  return response.data;
}
