import { apiRequest } from "../api";

type JsonRecord = Record<string, unknown>;

export type SubmissionStatus =
  | "PENDING"
  | "RUNNING"
  | "AC"
  | "PA"  // Partially Accepted - 部分通過
  | "WA"
  | "CE"
  | "TLE"
  | "MLE"
  | "RE"
  | "OLE"
  | "SA"
  | "JUDGE_ERROR";

export type ProgrammingLanguage = "C" | "CPP" | "JAVA" | "PYTHON";

export interface PipelineStageResult {
  id: string;
  submissionId: string;
  stageType: string;
  order: number;
  status: SubmissionStatus;
  timeMs: number | null;
  memoryKb: number | null;
  details: any;
}

export interface Submission {
  id: string;
  userId: number;
  problemId: string;
  courseId: number | null;
  homeworkId: string | null;
  language: ProgrammingLanguage;
  status: SubmissionStatus;
  score: number | null;
  rawScore: number | null;
  sourceKey: string;
  compileLog: string | null;
  summary: any;
  testdataVersion: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  judgedAt: string | null;
  pipelineResults: any | null;
  artifactsKey: string | null;
  user?: {
    id: number;
    username: string;
    nickname: string | null;
  };
  problem?: {
    id: string;
    displayId: string;
    title: string;
    canViewStdout: boolean;
  };
  cases?: SubmissionCase[];
  stageResults?: PipelineStageResult[];
}

export interface SubmissionCase {
  id: string;
  submissionId: string;
  caseNo: number;
  name: string | null;
  status: SubmissionStatus;
  timeMs: number | null;
  memoryKb: number | null;
  stdoutTrunc: string | null;
  stderrTrunc: string | null;
  expectedOutputTrunc: string | null;
  points: number | null;
  isSample: boolean;
}

export interface CreateSubmissionDto {
  language: ProgrammingLanguage;
  source: string;
  courseId?: number;
  homeworkId?: string;
}

export interface TestCodeDto {
  language: ProgrammingLanguage;
  source: string;
  homeworkId?: string;
  customInput?: string;
}

export interface TestResult {
  name: string;
  status: SubmissionStatus;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  passed?: boolean;
}

export interface CodeTestResponse {
  compileStatus: SubmissionStatus;
  compileLog?: string;
  results: TestResult[];
}

export interface SubmissionListResponse {
  submissions: Submission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function createSubmission(
  problemDisplayId: string,
  data: CreateSubmissionDto,
  accessToken?: string | null,
): Promise<{ submissionId: string }> {
  return apiRequest<{ submissionId: string }>(
    `/problems/${problemDisplayId}/submissions`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      json: data as unknown as JsonRecord,
    },
  );
}

export async function getSubmissions(
  params: {
    mine?: boolean;
    courseId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: SubmissionStatus;
    userId?: number;
    page?: number;
    limit?: number;
  },
  accessToken?: string | null,
): Promise<SubmissionListResponse> {
  const searchParams = new URLSearchParams();

  if (params.mine) searchParams.set("mine", "true");
  if (params.courseId) searchParams.set("courseId", params.courseId.toString());
  if (params.homeworkId) searchParams.set("homeworkId", params.homeworkId);
  if (params.problemId) searchParams.set("problemId", params.problemId);
  if (params.status) searchParams.set("status", params.status);
  if (params.userId) searchParams.set("userId", params.userId.toString());
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return apiRequest<SubmissionListResponse>(
    `/submissions?${searchParams.toString()}`,
    { headers },
  );
}

export async function getSubmission(
  submissionId: string,
  accessToken?: string | null,
): Promise<Submission> {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return apiRequest<Submission>(`/submissions/${submissionId}`, { headers });
}

export async function testCode(
  problemDisplayId: string,
  data: TestCodeDto,
  accessToken?: string | null,
): Promise<CodeTestResponse> {
  return apiRequest<CodeTestResponse>(
    `/problems/${problemDisplayId}/submissions/test`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      json: data as unknown as JsonRecord,
    },
  );
}

export async function getSubmissionSource(
  submissionId: string,
  accessToken?: string | null,
): Promise<{ source: string }> {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return apiRequest<{ source: string }>(`/submissions/${submissionId}/source`, {
    headers,
  });
}

export interface CreateZipSubmissionDto {
  language: ProgrammingLanguage;
  courseId?: number;
  homeworkId?: string;
}

/**
 * Create submission with ZIP file (for MULTI_FILE submission type)
 */
export async function createSubmissionWithZip(
  problemDisplayId: string,
  zipFile: File,
  data: CreateZipSubmissionDto,
  accessToken?: string | null,
): Promise<{ submissionId: string }> {
  const formData = new FormData();
  formData.append("file", zipFile);
  formData.append("language", data.language);
  if (data.courseId) {
    formData.append("courseId", data.courseId.toString());
  }
  if (data.homeworkId) {
    formData.append("homeworkId", data.homeworkId);
  }

  return apiRequest<{ submissionId: string }>(
    `/problems/${problemDisplayId}/submissions/zip`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );
}
