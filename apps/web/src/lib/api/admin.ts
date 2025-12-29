import { apiRequest } from "../api";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "DISABLED";
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUserListResponse = {
  users: AdminUser[];
  pagination: Pagination;
};

export type EmailSendLog = {
  id: number;
  type: "GENERIC" | "VERIFY_EMAIL" | "PASSWORD_RESET";
  status: "SENT" | "SKIPPED" | "FAILED";
  recipientEmail: string;
  subject: string | null;
  provider: string | null;
  messageId: string | null;
  error: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: number; username: string } | null;
};

export type EmailSendLogListResponse = {
  logs: EmailSendLog[];
  pagination: Pagination;
};

export type AuditLog = {
  id: number;
  action: "REGISTER" | "LOGIN" | "LOGOUT";
  result: "SUCCESS" | "FAILURE";
  ip: string | null;
  userAgent: string | null;
  detail: unknown;
  createdAt: string;
  user: { id: number; username: string; email: string; role: string } | null;
};

export type AuditLogListResponse = {
  logs: AuditLog[];
  pagination: Pagination;
};

export type AiFeatureConfig = {
  feature: "ASSISTANT" | "PROBLEM_CREATOR" | "TESTDATA_GENERATOR" | "TRANSLATOR" | "CODE_SAFETY_CHECK";
  provider: "OPENAI" | "GEMINI";
  model: string;
  reasoningEffort: "NONE" | "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "XHIGH";
  maxOutputTokens: number;
  temperature: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiConfigsResponse = {
  forceDisabled: boolean;
  configs: AiFeatureConfig[];
};

export async function listAdminUsers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: "ADMIN" | "USER";
    status?: "ACTIVE" | "DISABLED";
  },
  accessToken: string,
): Promise<AdminUserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search) searchParams.set("search", params.search);
  if (params.role) searchParams.set("role", params.role);
  if (params.status) searchParams.set("status", params.status);
  return apiRequest<AdminUserListResponse>(`/admin/users?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateUserStatus(
  userId: number,
  status: "ACTIVE" | "DISABLED",
  reason: string | undefined,
  accessToken: string,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, reason }),
  });
}

export async function updateUserRole(
  userId: number,
  role: "ADMIN" | "USER",
  accessToken: string,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/role`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(
  userId: number,
  accessToken: string,
): Promise<{ id: number; username: string; email: string }> {
  return apiRequest<{ id: number; username: string; email: string }>(
    `/admin/users/${userId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function forceLogoutUser(
  userId: number,
  accessToken: string,
): Promise<{ id: number; username: string; revokedTokens: number }> {
  return apiRequest<{ id: number; username: string; revokedTokens: number }>(
    `/admin/users/${userId}/force-logout`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function listEmailSendLogs(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<EmailSendLogListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<EmailSendLogListResponse>(
    `/admin/email-sends?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function listAuthEvents(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<AuditLogListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<AuditLogListResponse>(
    `/admin/auth-events?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function getAiConfigs(accessToken: string): Promise<AiConfigsResponse> {
  return apiRequest<AiConfigsResponse>("/admin/ai-configs", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateAiConfigs(
  payload: {
    forceDisabled: boolean;
    configs: Array<{
      feature: "ASSISTANT" | "PROBLEM_CREATOR" | "TESTDATA_GENERATOR" | "TRANSLATOR" | "CODE_SAFETY_CHECK";
      provider: "OPENAI" | "GEMINI";
      model: string;
      reasoningEffort?: "NONE" | "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "XHIGH";
      maxOutputTokens?: number;
      temperature?: number;
      enabled?: boolean;
    }>;
  },
  accessToken: string,
): Promise<AiConfigsResponse> {
  return apiRequest<AiConfigsResponse>("/admin/ai-configs", {
    method: "PUT",
    json: payload,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// =========================================================================
// Blocked Submissions (Code Safety Check)
// =========================================================================

export type BlockedSubmission = {
  id: string;
  userId: number | null;
  user: { id: number; username: string } | null;
  problemId: string | null;
  problem: { id: string; displayId: string; title: string } | null;
  sourceType: "SUBMIT" | "TEST" | "EXAM_SUBMIT";
  language: "C" | "CPP" | "JAVA" | "PYTHON";
  sourceTrunc: string;
  threatType: string;
  reason: string;
  analysis: string | null;
  aiResponse: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  ip: string | null;
  userAgent: string | null;
  examId: string | null;
  createdAt: string;
};

export type BlockedSubmissionListResponse = {
  submissions: BlockedSubmission[];
  pagination: Pagination;
};

export async function listBlockedSubmissions(
  params: {
    page?: number;
    limit?: number;
    threatType?: string;
    userId?: number;
  },
  accessToken: string,
): Promise<BlockedSubmissionListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.threatType) search.set("threatType", params.threatType);
  if (params.userId) search.set("userId", String(params.userId));
  return apiRequest<BlockedSubmissionListResponse>(
    `/admin/blocked-submissions?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function getBlockedSubmission(
  id: string,
  accessToken: string,
): Promise<BlockedSubmission> {
  return apiRequest<BlockedSubmission>(`/admin/blocked-submissions/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// =========================================================================
// Email Domain Management
// =========================================================================

export type EmailDomain = {
  id: number;
  domain: string;
  note: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmailDomainListResponse = {
  domains: EmailDomain[];
  pagination: Pagination;
};

export type BlocklistStatsResponse = {
  count: number;
};

export type CheckDisposableResponse = {
  domain: string;
  isDisposable: boolean;
};

// Allowed Domains (Whitelist)

export async function listAllowedDomains(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<EmailDomainListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<EmailDomainListResponse>(
    `/admin/email-domains/allowed?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function createAllowedDomain(
  data: { domain: string; note?: string },
  accessToken: string,
): Promise<EmailDomain> {
  return apiRequest<EmailDomain>("/admin/email-domains/allowed", {
    method: "POST",
    json: data,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateAllowedDomain(
  id: number,
  data: { domain?: string; note?: string; enabled?: boolean },
  accessToken: string,
): Promise<EmailDomain> {
  return apiRequest<EmailDomain>(`/admin/email-domains/allowed/${id}`, {
    method: "PUT",
    json: data,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function deleteAllowedDomain(
  id: number,
  accessToken: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/admin/email-domains/allowed/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Blocked Domains (Custom Blacklist)

export async function listBlockedDomains(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<EmailDomainListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<EmailDomainListResponse>(
    `/admin/email-domains/blocked?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function createBlockedDomain(
  data: { domain: string; note?: string },
  accessToken: string,
): Promise<EmailDomain> {
  return apiRequest<EmailDomain>("/admin/email-domains/blocked", {
    method: "POST",
    json: data,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateBlockedDomain(
  id: number,
  data: { domain?: string; note?: string; enabled?: boolean },
  accessToken: string,
): Promise<EmailDomain> {
  return apiRequest<EmailDomain>(`/admin/email-domains/blocked/${id}`, {
    method: "PUT",
    json: data,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function deleteBlockedDomain(
  id: number,
  accessToken: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/admin/email-domains/blocked/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Utility

export async function getBlocklistStats(
  accessToken: string,
): Promise<BlocklistStatsResponse> {
  return apiRequest<BlocklistStatsResponse>(
    "/admin/email-domains/blocklist-stats",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function checkDisposable(
  domain: string,
  accessToken: string,
): Promise<CheckDisposableResponse> {
  return apiRequest<CheckDisposableResponse>(
    `/admin/email-domains/check-disposable?domain=${encodeURIComponent(domain)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

// =========================================================================
// System Config
// =========================================================================

export type EmailRateLimits = {
  verify: {
    ttlSeconds: number;
    perRecipientLimit: number;
    perIpLimit: number;
  };
  reset: {
    ttlSeconds: number;
    perRecipientLimit: number;
    perIpLimit: number;
  };
  globalIp: {
    ttlSeconds: number;
    limit: number;
  };
};

export type SystemConfig = {
  id: number;
  siteName: string;
  faviconKey: string | null;
  registrationEnabled: boolean;
  registrationDisabledUntil: string | null;
  emailSendingEnabled: boolean;
  emailSendingDisabledUntil: string | null;
  emailRlVerifyTtl: number | null;
  emailRlVerifyToLimit: number | null;
  emailRlVerifyIpLimit: number | null;
  emailRlResetTtl: number | null;
  emailRlResetToLimit: number | null;
  emailRlResetIpLimit: number | null;
  emailRlGlobalIpTtl: number | null;
  emailRlGlobalIpLimit: number | null;
  createdAt: string;
  updatedAt: string;
  emailRateLimits: EmailRateLimits;
};

export type UpdateSystemConfigPayload = {
  registrationEnabled?: boolean;
  registrationDisabledUntil?: string | null;
  emailSendingEnabled?: boolean;
  emailSendingDisabledUntil?: string | null;
  emailRlVerifyTtl?: number | null;
  emailRlVerifyToLimit?: number | null;
  emailRlVerifyIpLimit?: number | null;
  emailRlResetTtl?: number | null;
  emailRlResetToLimit?: number | null;
  emailRlResetIpLimit?: number | null;
  emailRlGlobalIpTtl?: number | null;
  emailRlGlobalIpLimit?: number | null;
};

export async function getSystemConfig(
  accessToken: string,
): Promise<SystemConfig> {
  return apiRequest<SystemConfig>("/admin/system-config", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateSystemConfig(
  payload: UpdateSystemConfigPayload,
  accessToken: string,
): Promise<SystemConfig> {
  return apiRequest<SystemConfig>("/admin/system-config", {
    method: "PUT",
    json: payload,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// =========================================================================
// Pending Verification Users
// =========================================================================

export type PendingVerificationUser = {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
};

export type PendingVerificationUserListResponse = {
  users: PendingVerificationUser[];
  pagination: Pagination;
};

export async function listPendingVerificationUsers(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<PendingVerificationUserListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<PendingVerificationUserListResponse>(
    `/admin/users/pending-verification?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function forceVerifyUser(
  userId: number,
  accessToken: string,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/force-verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// =========================================================================
// Admin Action Logs
// =========================================================================

export type AdminActionLog = {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: number; username: string };
};

export type AdminActionLogListResponse = {
  logs: AdminActionLog[];
  pagination: Pagination;
};

export async function listAdminActionLogs(
  params: { page?: number; limit?: number },
  accessToken: string,
): Promise<AdminActionLogListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return apiRequest<AdminActionLogListResponse>(
    `/admin/action-logs?${search.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

// =========================================================================
// Bulk Create Users
// =========================================================================

export type CourseForSelection = {
  id: number;
  slug: string | null;
  name: string;
  term: string;
  code: string;
};

export type BulkCreateUsersPayload = {
  emails: string[];
  autoVerify: boolean;
  passwordMode: "specified" | "random";
  password?: string;
  courseId?: number;
};

export type BulkCreateUsersResult = {
  created: Array<{
    email: string;
    username: string;
    userId: number;
    passwordSent: boolean;
  }>;
  skipped: Array<{
    email: string;
    reason: string;
  }>;
  errors: Array<{
    email: string;
    error: string;
  }>;
};

export async function listCoursesForSelection(
  accessToken: string,
): Promise<CourseForSelection[]> {
  return apiRequest<CourseForSelection[]>("/admin/courses-for-selection", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function bulkCreateUsers(
  payload: BulkCreateUsersPayload,
  accessToken: string,
): Promise<BulkCreateUsersResult> {
  return apiRequest<BulkCreateUsersResult>("/admin/bulk-create-users", {
    method: "POST",
    json: payload,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ============================================================================
// Demo Data Generator
// ============================================================================

export type DemoDataStatus = {
  hasAdminUser: boolean;
  adminUserId: number | null;
  demoUserCount: number;
  publicProblemCount: number;
  courseCount: number;
};

export type DemoDataResult = {
  adminUser: {
    username: string;
    email: string;
    password: string | null;
    isNew: boolean;
  };
  demoUsers: Array<{
    username: string;
    email: string;
    password: string;
  }>;
  publicProblems: Array<{
    displayId: string;
    title: string;
    isNew: boolean;
  }>;
  courses: Array<{
    slug: string;
    name: string;
    problemCount: number;
    memberCount: number;
    homeworkCount: number;
    announcementCount: number;
    isNew: boolean;
  }>;
  summary: {
    usersCreated: number;
    usersSkipped: number;
    problemsCreated: number;
    problemsSkipped: number;
    coursesCreated: number;
    coursesSkipped: number;
  };
};

export type ClearDemoDataResult = {
  usersDeleted: number;
  problemsDeleted: number;
  coursesDeleted: number;
  success: boolean;
};

export async function getDemoDataStatus(
  accessToken: string,
): Promise<DemoDataStatus> {
  return apiRequest<DemoDataStatus>("/admin/demo-data/status", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function generateDemoData(
  accessToken: string,
): Promise<DemoDataResult> {
  return apiRequest<DemoDataResult>("/admin/demo-data/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function clearDemoData(
  accessToken: string,
): Promise<ClearDemoDataResult> {
  return apiRequest<ClearDemoDataResult>("/admin/demo-data", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
