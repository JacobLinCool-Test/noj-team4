import { apiRequest, getApiBaseUrl } from "../api";

export type AuditResult = "SUCCESS" | "FAILURE";

export interface LoginAuditLog {
  id: number;
  action: "LOGIN";
  result: AuditResult;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  } | null;
}

export interface LoginAuditListResponse {
  logs: LoginAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubmissionAuditItem {
  id: string;
  status: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    nickname: string | null;
  } | null;
  course?: {
    id: number;
    name: string;
    code: string;
    term: string;
  } | null;
  homework?: {
    id: string;
    title: string;
  } | null;
  problem?: {
    displayId: string;
    title: string;
  } | null;
}

export interface SubmissionAuditListResponse {
  submissions: SubmissionAuditItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type QueryParams = Record<string, string | number | undefined>;

function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function downloadCsv(path: string, accessToken?: string | null): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "text/csv",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(text || `Request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export async function listCourseLoginAudits(
  courseSlug: string,
  params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    page?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<LoginAuditListResponse> {
  return apiRequest<LoginAuditListResponse>(
    `/courses/${courseSlug}/audit/logins${buildQuery(params)}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

export async function listCourseSubmissionAudits(
  courseSlug: string,
  params: {
    startAt?: string;
    endAt?: string;
    userId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<SubmissionAuditListResponse> {
  return apiRequest<SubmissionAuditListResponse>(
    `/courses/${courseSlug}/audit/submissions${buildQuery(params)}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

export async function exportCourseLoginAuditsCsv(
  courseSlug: string,
  params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<Blob> {
  return downloadCsv(`/courses/${courseSlug}/audit/logins/export${buildQuery(params)}`, accessToken);
}

export async function exportCourseSubmissionAuditsCsv(
  courseSlug: string,
  params: {
    startAt?: string;
    endAt?: string;
    userId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<Blob> {
  return downloadCsv(`/courses/${courseSlug}/audit/submissions/export${buildQuery(params)}`, accessToken);
}

export async function listAdminLoginAudits(
  params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    page?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<LoginAuditListResponse> {
  return apiRequest<LoginAuditListResponse>(
    `/admin/audit/logins${buildQuery(params)}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

export async function listAdminSubmissionAudits(
  params: {
    startAt?: string;
    endAt?: string;
    courseId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    userId?: number;
    page?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<SubmissionAuditListResponse> {
  return apiRequest<SubmissionAuditListResponse>(
    `/admin/audit/submissions${buildQuery(params)}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

export async function exportAdminLoginAuditsCsv(
  params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<Blob> {
  return downloadCsv(`/admin/audit/logins/export${buildQuery(params)}`, accessToken);
}

export async function exportAdminSubmissionAuditsCsv(
  params: {
    startAt?: string;
    endAt?: string;
    courseId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    userId?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<Blob> {
  return downloadCsv(`/admin/audit/submissions/export${buildQuery(params)}`, accessToken);
}
