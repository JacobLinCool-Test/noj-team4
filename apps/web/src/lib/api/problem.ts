import { apiRequest, getApiBaseUrl } from "../api";

export type ProgrammingLanguage = "C" | "CPP" | "JAVA" | "PYTHON";
export type ProblemVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type ProblemDifficulty = "UNKNOWN" | "EASY" | "MEDIUM" | "HARD";
export type TranslationStatus = "NONE" | "PENDING" | "COMPLETED" | "FAILED";

export type ProblemSampleCase = {
  input: string;
  output: string;
};

export type Problem = {
  id: string;
  displayId: string;
  visibility: ProblemVisibility;
  difficulty: ProblemDifficulty;
  tags: string[];
  allowedLanguages: ProgrammingLanguage[];
  canViewStdout: boolean;

  title: string;
  description: string;
  input: string;
  output: string;
  hint: string | null;
  sampleCases: ProblemSampleCase[];

  // Bilingual fields
  titleZh?: string | null;
  titleEn?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  inputZh?: string | null;
  inputEn?: string | null;
  outputZh?: string | null;
  outputEn?: string | null;
  hintZh?: string | null;
  hintEn?: string | null;
  tagsZh?: string[];
  tagsEn?: string[];

  // Translation status
  sourceLanguage?: string;
  translationStatus?: TranslationStatus;
  lastTranslatedAt?: string | null;

  owner: {
    id: number;
    username: string;
    nickname: string | null;
  };

  courseIds?: number[];
  courseContext?: {
    courseId: number;
    courseSlug: string | null;
    quota: number;
  };
  createdAt: string;
  updatedAt: string;

  canEdit: boolean;
  canDelete: boolean;
};

export type ProblemListResponse = {
  items: Problem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListProblemsParams = {
  q?: string;
  difficulty?: ProblemDifficulty;
  tags?: string[];
  page?: number;
  pageSize?: number;
  scope?: "public" | "mine";
};

export async function listProblems(
  params?: ListProblemsParams,
  accessToken?: string | null,
): Promise<ProblemListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.difficulty) query.set("difficulty", params.difficulty);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.scope) query.set("scope", params.scope);
  if (params?.tags && params.tags.length > 0) query.set("tags", params.tags.join(","));

  const queryString = query.toString();
  const path = queryString ? `/problems?${queryString}` : "/problems";

  return apiRequest<ProblemListResponse>(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getProblem(
  id: string,
  accessToken?: string | null,
  options?: { homeworkId?: string | null },
): Promise<Problem> {
  const query = new URLSearchParams();
  if (options?.homeworkId) query.set("homeworkId", options.homeworkId);
  const qs = query.toString();
  const path = qs ? `/problems/${id}?${qs}` : `/problems/${id}`;
  return apiRequest<Problem>(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export type CreateProblemPayload = {
  visibility: ProblemVisibility;
  difficulty: ProblemDifficulty;
  tags?: string[];
  allowedLanguages: ProgrammingLanguage[];
  canViewStdout: boolean;
  title: string;
  description: string;
  input: string;
  output: string;
  hint?: string;
  sampleCases: ProblemSampleCase[];
  courseIds?: number[];
  // Bilingual fields
  titleZh?: string;
  titleEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  inputZh?: string;
  inputEn?: string;
  outputZh?: string;
  outputEn?: string;
  hintZh?: string;
  hintEn?: string;
  tagsZh?: string[];
  tagsEn?: string[];
  // Auto translate option
  autoTranslate?: boolean;
};

export async function createProblem(
  payload: CreateProblemPayload,
  accessToken?: string | null,
): Promise<Problem> {
  return apiRequest<Problem>("/problems", {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateProblem(
  id: string,
  payload: Partial<CreateProblemPayload>,
  accessToken?: string | null,
): Promise<Problem> {
  return apiRequest<Problem>(`/problems/${id}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function deleteProblem(id: string, accessToken?: string | null): Promise<void> {
  await apiRequest(`/problems/${id}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function listProblemTags(accessToken?: string | null): Promise<string[]> {
  return apiRequest<string[]>("/problems/tags", {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// Testdata API

export type TestdataVersion = {
  id: string;
  version: number;
  isActive: boolean;
  caseCount: number;
  uploadedAt: string;
  uploadedBy: {
    id: number;
    username: string;
    nickname: string | null;
  };
};

export type UploadTestdataResponse = {
  id: string;
  version: number;
  caseCount: number;
  isActive: boolean;
  message: string;
};

export async function listTestdataVersions(
  displayId: string,
  accessToken?: string | null,
): Promise<TestdataVersion[]> {
  return apiRequest<TestdataVersion[]>(`/problems/${displayId}/testdata`, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function uploadTestdata(
  displayId: string,
  file: File,
  accessToken?: string | null,
): Promise<UploadTestdataResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<UploadTestdataResponse>(`/problems/${displayId}/testdata`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
}

export async function activateTestdataVersion(
  displayId: string,
  version: number,
  accessToken?: string | null,
): Promise<{ message: string; version: number }> {
  return apiRequest<{ message: string; version: number }>(
    `/problems/${displayId}/testdata/activate`,
    {
      method: "PATCH",
      json: { version },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

// Subtask configuration types
export type SubtaskConfig = {
  caseCount: number;
  points: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
};

export type TestdataUploadConfig = {
  subtasks: SubtaskConfig[];
  defaultTimeLimitMs: number;
  defaultMemoryLimitKb: number;
};

export type UploadTestdataWithSubtasksResponse = {
  id: string;
  version: number;
  caseCount: number;
  subtaskCount: number;
  totalPoints: number;
  isActive: boolean;
  message: string;
};

/**
 * Upload testdata with subtask configuration (sstt.in/out format)
 */
export async function uploadTestdataWithSubtasks(
  displayId: string,
  file: File,
  config: TestdataUploadConfig,
  accessToken?: string | null,
): Promise<UploadTestdataWithSubtasksResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("config", JSON.stringify(config));

  return apiRequest<UploadTestdataWithSubtasksResponse>(
    `/problems/${displayId}/testdata/subtasks`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );
}

/**
 * Download testdata ZIP for a specific version
 */
export async function downloadTestdata(
  displayId: string,
  version: number,
  accessToken?: string | null,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/problems/${displayId}/testdata/${version}/download`,
    {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Download failed");
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `testdata-${displayId}-v${version}.zip`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }

  // Download the file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Link AI-generated testdata to a problem using testdataKey
 */
export async function linkAiTestdata(
  displayId: string,
  testdataKey: string,
  accessToken?: string | null,
): Promise<UploadTestdataWithSubtasksResponse> {
  return apiRequest<UploadTestdataWithSubtasksResponse>(
    `/problems/${displayId}/testdata/link`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      json: { testdataKey },
    },
  );
}

// =========================================================================
// Translation API
// =========================================================================

export type TranslationStatusResponse = {
  status: TranslationStatus;
  error?: string | null;
  lastTranslatedAt?: string | null;
};

/**
 * Trigger translation for a problem
 */
export async function triggerTranslation(
  displayId: string,
  accessToken: string,
): Promise<{ message: string; status: TranslationStatus }> {
  return apiRequest<{ message: string; status: TranslationStatus }>(
    `/problems/${displayId}/translate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

/**
 * Get translation status for a problem
 */
export async function getTranslationStatus(
  displayId: string,
  accessToken: string,
): Promise<TranslationStatusResponse> {
  return apiRequest<TranslationStatusResponse>(
    `/problems/${displayId}/translate/status`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}
