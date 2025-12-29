import { apiRequest } from '../api';

export enum TokenScope {
  READ_USER = 'READ_USER',
  READ_COURSES = 'READ_COURSES',
  WRITE_COURSES = 'WRITE_COURSES',
  READ_PROBLEMS = 'READ_PROBLEMS',
  WRITE_PROBLEMS = 'WRITE_PROBLEMS',
  READ_SUBMISSIONS = 'READ_SUBMISSIONS',
  WRITE_SUBMISSIONS = 'WRITE_SUBMISSIONS',
}

export interface ApiToken {
  id: number;
  name: string;
  scopes: TokenScope[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiToken extends ApiToken {
  token: string;
}

export interface CreateApiTokenRequest {
  name: string;
  scopes: TokenScope[];
}

export async function createApiToken(
  data: CreateApiTokenRequest,
  accessToken?: string,
): Promise<CreatedApiToken> {
  return apiRequest<CreatedApiToken>('/api-tokens', {
    method: 'POST',
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    json: data as unknown as Record<string, unknown>,
  });
}

export async function listApiTokens(
  accessToken?: string,
): Promise<ApiToken[]> {
  return apiRequest<ApiToken[]>('/api-tokens', {
    method: 'GET',
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
}

export async function revokeApiToken(
  tokenId: number,
  accessToken?: string,
): Promise<void> {
  return apiRequest<void>(`/api-tokens/${tokenId}`, {
    method: 'DELETE',
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
}
