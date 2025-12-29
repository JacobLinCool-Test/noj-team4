import { apiRequest, getApiBaseUrl } from "../api";

export interface UserProfile {
  username: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfilePayload {
  nickname?: string;
  bio?: string;
  avatarUrl?: string;
  [key: string]: unknown;
}

export interface UserStats {
  totalSubmissions: number;
  acCount: number;
  acceptanceRate: number;
}

export interface UserSubmission {
  id: string;
  problemId: string;
  language: string;
  status: string;
  score: number | null;
  createdAt: string;
  problem: {
    displayId: string;
    title: string;
  };
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/users/${username}`);
}

export async function updateProfile(
  payload: UpdateProfilePayload,
  accessToken?: string | null,
): Promise<UserProfile> {
  return apiRequest<UserProfile>("/users/me", {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getUserStats(username: string): Promise<UserStats> {
  return apiRequest<UserStats>(`/users/${username}/stats`);
}

export async function getUserRecentSubmissions(
  username: string,
  limit: number = 10,
): Promise<UserSubmission[]> {
  return apiRequest<UserSubmission[]>(`/users/${username}/submissions?limit=${limit}`);
}

export async function uploadAvatar(
  file: File,
  accessToken?: string | null,
): Promise<{ avatarUrl: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ avatarUrl: string; message: string }>("/users/me/avatar", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
}

export async function removeAvatar(
  accessToken?: string | null,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/users/me/avatar", {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export function getAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  // If it's a relative path, prepend API base URL
  if (avatarUrl.startsWith("/")) {
    return `${getApiBaseUrl()}${avatarUrl}`;
  }
  // If it's already a full URL (legacy data), return as-is
  return avatarUrl;
}

// User Preferences
export interface UserPreferences {
  editorFontSize: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  editorFontSize: 16,
};

export async function getPreferences(
  accessToken?: string | null,
): Promise<UserPreferences> {
  return apiRequest<UserPreferences>("/users/me/preferences", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updatePreferences(
  preferences: Partial<UserPreferences>,
  accessToken?: string | null,
): Promise<UserPreferences> {
  return apiRequest<UserPreferences>("/users/me/preferences", {
    method: "PATCH",
    json: preferences,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
