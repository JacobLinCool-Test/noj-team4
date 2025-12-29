import { getApiBaseUrl } from "../api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export type CourseInvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type CourseInvitation = {
  id: string;
  courseId: number;
  course: {
    id: number;
    slug: string;
    name: string;
    term: string;
  };
  email: string;
  status: CourseInvitationStatus;
  invitedBy: {
    id: number;
    username: string;
    nickname: string | null;
  };
  createdAt: string;
  respondedAt: string | null;
};

export type CreateInvitationsResult = {
  invited: string[];
  alreadyMember: string[];
  alreadyInvited: string[];
  invalidEmail: string[];
};

type RequestOptions = RequestInit & { json?: unknown; accessToken?: string | null };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

export async function createCourseInvitations(
  courseSlug: string,
  emails: string,
  accessToken?: string | null,
): Promise<CreateInvitationsResult> {
  return request<CreateInvitationsResult>(`/courses/${courseSlug}/invitations`, {
    method: "POST",
    json: { emails },
    accessToken,
  });
}

export async function listCourseInvitations(
  courseSlug: string,
  accessToken?: string | null,
): Promise<CourseInvitation[]> {
  return request<CourseInvitation[]>(`/courses/${courseSlug}/invitations`, { accessToken });
}

export async function cancelCourseInvitation(
  courseSlug: string,
  invitationId: string,
  accessToken?: string | null,
): Promise<void> {
  await request<{ success: boolean }>(`/courses/${courseSlug}/invitations/${invitationId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function listMyInvitations(accessToken?: string | null): Promise<CourseInvitation[]> {
  return request<CourseInvitation[]>("/me/invitations", { accessToken });
}

export async function acceptInvitation(
  invitationId: string,
  accessToken?: string | null,
): Promise<{ courseSlug: string }> {
  return request<{ courseSlug: string }>(`/me/invitations/${invitationId}/accept`, {
    method: "POST",
    accessToken,
  });
}

export async function rejectInvitation(invitationId: string, accessToken?: string | null): Promise<void> {
  await request<{ success: boolean }>(`/me/invitations/${invitationId}/reject`, {
    method: "POST",
    accessToken,
  });
}
