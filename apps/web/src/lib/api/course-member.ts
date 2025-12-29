import type { CourseMember, CourseRole } from "@/types/course";
import { getApiBaseUrl } from "../api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & { json?: unknown; accessToken?: string | null };

async function requestCourseMembers<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, accessToken, headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
      typeof messageValue === "string"
        ? messageValue
        : messageValue && typeof messageValue === "object" && "code" in (messageValue as Record<string, unknown>)
          ? String((messageValue as Record<string, unknown>).code)
          : messageValue && typeof messageValue === "object" && "message" in (messageValue as Record<string, unknown>)
            ? String((messageValue as Record<string, unknown>).message)
            : undefined;
    throw new ApiError(response.status, derivedMessage || `Request failed (${response.status})`);
  }

  return (payload as T) ?? ({} as T);
}

export async function listCourseMembers(courseSlug: string, accessToken?: string | null): Promise<CourseMember[]> {
  return requestCourseMembers<CourseMember[]>(`/courses/${courseSlug}/members`, { accessToken });
}

export async function updateCourseMemberRole(
  courseSlug: string,
  memberId: string | number,
  role: CourseRole,
  accessToken?: string | null,
): Promise<CourseMember[]> {
  return requestCourseMembers<CourseMember[]>(`/courses/${courseSlug}/members/${memberId}`, {
    method: "PATCH",
    json: { role },
    accessToken,
  });
}

export async function removeCourseMember(
  courseSlug: string,
  memberId: string | number,
  accessToken?: string | null,
): Promise<CourseMember[]> {
  return requestCourseMembers<CourseMember[]>(`/courses/${courseSlug}/members/${memberId}`, {
    method: "DELETE",
    accessToken,
  });
}
