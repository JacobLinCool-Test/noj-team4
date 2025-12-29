import { getApiBaseUrl } from '../api';

export type CourseJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequestUser {
  id: number;
  username: string;
  nickname: string | null;
}

export interface JoinRequestCourse {
  id: number;
  slug: string;
  name: string;
  term: string;
}

export interface CourseJoinRequest {
  id: string;
  courseId: number;
  course: JoinRequestCourse;
  userId: number;
  user: JoinRequestUser;
  status: CourseJoinRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: JoinRequestUser | null;
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

export async function submitJoinRequest(
  courseSlug: string,
  accessToken: string | null,
): Promise<CourseJoinRequest> {
  return request<CourseJoinRequest>(`/courses/${courseSlug}/join-requests`, {
    method: 'POST',
    accessToken,
  });
}

export async function listCourseJoinRequests(
  courseSlug: string,
  accessToken: string | null,
): Promise<CourseJoinRequest[]> {
  return request<CourseJoinRequest[]>(`/courses/${courseSlug}/join-requests`, {
    accessToken,
  });
}

export async function approveJoinRequest(
  courseSlug: string,
  requestId: string,
  accessToken: string | null,
): Promise<CourseJoinRequest> {
  return request<CourseJoinRequest>(
    `/courses/${courseSlug}/join-requests/${requestId}/approve`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export async function rejectJoinRequest(
  courseSlug: string,
  requestId: string,
  accessToken: string | null,
): Promise<CourseJoinRequest> {
  return request<CourseJoinRequest>(
    `/courses/${courseSlug}/join-requests/${requestId}/reject`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export async function listMyJoinRequests(
  accessToken: string | null,
): Promise<CourseJoinRequest[]> {
  return request<CourseJoinRequest[]>('/me/join-requests', { accessToken });
}

export async function cancelMyJoinRequest(
  requestId: string,
  accessToken: string | null,
): Promise<void> {
  await request<void>(`/me/join-requests/${requestId}`, {
    method: 'DELETE',
    accessToken,
  });
}
