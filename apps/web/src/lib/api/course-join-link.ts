import { getApiBaseUrl } from '../api';
import type { CourseDetail } from '@/types/course';

export interface JoinLinkCourse {
  id: number;
  slug: string;
  name: string;
  term: string;
  description: string | null;
  teacher: {
    id: number;
    nickname: string;
  } | null;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

type RequestOptions = RequestInit & { json?: unknown; accessToken?: string | null };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, accessToken, headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: json ? JSON.stringify(json) : options.body,
  });

  const payload = await response
    .json()
    .catch(() => null)
    .then((data) => data as Record<string, unknown> | null);

  if (!response.ok) {
    const messageValue = payload?.message;
    const derivedMessage =
      typeof messageValue === 'string'
        ? messageValue
        : messageValue && typeof messageValue === 'object' && 'code' in (messageValue as Record<string, unknown>)
          ? String((messageValue as Record<string, unknown>).code)
          : undefined;
    throw new ApiError(response.status, derivedMessage || `Request failed (${response.status})`);
  }

  return (payload as T) ?? ({} as T);
}

export async function getJoinLinkCourse(token: string): Promise<JoinLinkCourse> {
  return request<JoinLinkCourse>(`/courses/join/${token}`, {});
}

export async function joinByLink(
  token: string,
  accessToken: string | null,
): Promise<CourseDetail> {
  return request<CourseDetail>(`/courses/join/${token}`, {
    method: 'POST',
    accessToken,
  });
}
