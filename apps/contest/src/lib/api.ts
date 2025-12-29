const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiError {
  message: string;
  statusCode: number;
  retryAfter?: number;
}

export interface ExamInfo {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  scoreboardVisible: boolean;
}

export interface TimeRemaining {
  remaining: number;
  startsAt: string;
  endsAt: string;
  started: boolean;
  ended: boolean;
}

export interface ExamUser {
  id: number;
  username: string;
  displayName: string;
}

export interface Problem {
  id: string;
  title: string;
  status?: 'unsolved' | 'attempted' | 'solved';
}

export type SubmissionType = 'SINGLE_FILE' | 'MULTI_FILE' | 'FUNCTION_ONLY';
export type ProgrammingLanguage = 'C' | 'CPP' | 'JAVA' | 'PYTHON';

export interface ProblemDetail extends Problem {
  displayId: string;
  description: string;
  input: string;
  output: string;
  hint?: string | null;
  sampleInputs: string[];
  sampleOutputs: string[];
  difficulty: string;
  submissionType: SubmissionType;
  allowedLanguages: ProgrammingLanguage[];
}

export interface Submission {
  id: string;
  problemId: string;
  problemTitle: string;
  language: string;
  status: string;
  score: number;
  createdAt: string;
}

export interface SubmissionDetail extends Submission {
  code: string;
  testResults?: Array<{
    testcase: number;
    status: string;
    time: number;
    memory: number;
  }>;
}

export interface ScoreboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  totalScore: number;
  problems: Array<{
    problemId: string;
    score: number;
    attempts: number;
    solvedAt?: string;
  }>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Unknown error',
      statusCode: response.status,
    }));
    throw error as ApiError;
  }

  return response.json();
}

// 登入
export async function login(code: string) {
  return apiRequest<{
    success: boolean;
    exam: ExamInfo;
    time: TimeRemaining;
  }>('/contest/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// 登出
export async function logout() {
  return apiRequest<{ success: boolean }>('/contest/logout', {
    method: 'POST',
  });
}

// 取得當前 Session
export async function getMe() {
  return apiRequest<{
    user: ExamUser;
    exam: ExamInfo;
    time: TimeRemaining;
  }>('/contest/me');
}

// 取得題目列表
export async function getProblems() {
  return apiRequest<{
    problems: Problem[];
    time: TimeRemaining;
  }>('/contest/problems');
}

// 取得題目詳情
export async function getProblem(problemId: string) {
  return apiRequest<{
    problem: ProblemDetail;
    time: TimeRemaining;
  }>(`/contest/problems/${problemId}`);
}

// 取得提交列表
export async function getSubmissions() {
  return apiRequest<{
    submissions: Submission[];
  }>('/contest/submissions');
}

// 取得提交詳情
export async function getSubmission(submissionId: string) {
  return apiRequest<{
    submission: SubmissionDetail;
  }>(`/contest/submissions/${submissionId}`);
}

// 取得排行榜
export async function getScoreboard() {
  return apiRequest<{
    scoreboard: ScoreboardEntry[];
  }>('/contest/scoreboard');
}

// 取得剩餘時間
export async function getTimeRemaining() {
  return apiRequest<TimeRemaining>('/contest/time');
}

// 提交程式碼（單一檔案）
export async function submitCode(
  problemId: string,
  code: string,
  language: string,
) {
  return apiRequest<{
    submission: Submission;
  }>(`/contest/problems/${problemId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  });
}

// 提交 ZIP 檔案（多檔案）
export async function submitZip(
  problemId: string,
  file: File,
  language: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);

  const url = `${API_BASE_URL}/contest/problems/${problemId}/submit-zip`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Unknown error',
      statusCode: response.status,
    }));
    throw error as ApiError;
  }

  return response.json() as Promise<{ submission: Submission }>;
}
