import { getApiBaseUrl } from "../api";

export type CopycatStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type ProgrammingLanguage = "C" | "CPP" | "JAVA" | "PYTHON";

export interface CopycatUser {
  id: number;
  username: string;
  nickname: string | null;
}

export interface CopycatPair {
  id: string;
  leftUser: CopycatUser;
  rightUser: CopycatUser;
  language: ProgrammingLanguage;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}

export interface CopycatSummary {
  languages: string[];
  avgSimilarity: number;
  maxSimilarity: number;
  suspiciousPairCount: number;
}

export interface CopycatReport {
  id: string;
  courseId: number;
  problemId: string;
  status: CopycatStatus;
  studentCount: number;
  submissionCount: number;
  summary: CopycatSummary | null;
  errorMessage: string | null;
  requestedBy: CopycatUser;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  topPairs: CopycatPair[];
}

export interface TriggerCopycatResponse {
  reportId: string;
  status: CopycatStatus;
}

export interface CopycatPairsResponse {
  pairs: CopycatPair[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CopycatPairDetail {
  id: string;
  leftUser: CopycatUser;
  rightUser: CopycatUser;
  leftCode: string;
  rightCode: string;
  language: ProgrammingLanguage;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}

export async function getCopycatReport(
  courseId: number,
  problemId: string,
  accessToken: string,
): Promise<CopycatReport | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/courses/${courseId}/problems/${problemId}/copycat`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to get copycat report (${response.status})`);
  }

  return response.json();
}

export async function triggerCopycat(
  courseId: number,
  problemId: string,
  accessToken: string,
): Promise<TriggerCopycatResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/courses/${courseId}/problems/${problemId}/copycat`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to trigger copycat (${response.status})`);
  }

  return response.json();
}

export async function getCopycatPairs(
  courseId: number,
  problemId: string,
  accessToken: string,
  options?: {
    page?: number;
    limit?: number;
    minSimilarity?: number;
    language?: ProgrammingLanguage;
  },
): Promise<CopycatPairsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.minSimilarity !== undefined) params.set("minSimilarity", String(options.minSimilarity));
  if (options?.language) params.set("language", options.language);

  const queryString = params.toString();
  const url = `${getApiBaseUrl()}/courses/${courseId}/problems/${problemId}/copycat/pairs${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to get copycat pairs (${response.status})`);
  }

  return response.json();
}

export async function deleteCopycatReport(
  courseId: number,
  problemId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/courses/${courseId}/problems/${problemId}/copycat`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to delete copycat report (${response.status})`);
  }
}

export async function getCopycatPairDetail(
  courseId: number,
  problemId: string,
  pairId: string,
  accessToken: string,
): Promise<CopycatPairDetail | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/courses/${courseId}/problems/${problemId}/copycat/pairs/${pairId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to get pair detail (${response.status})`);
  }

  return response.json();
}
