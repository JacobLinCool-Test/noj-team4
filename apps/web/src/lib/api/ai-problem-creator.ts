import { apiRequest, getApiBaseUrl } from "../api";
import { LOCALE_COOKIE } from "@/i18n/config";

// ========== Types ==========

export type ProblemDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ProgrammingLanguage = "C" | "CPP" | "JAVA" | "PYTHON";
export type ProblemVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export interface GeneratedProblem {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  sampleCases: Array<{ input: string; output: string }>;
  difficulty: ProblemDifficulty;
  tags: string[];
  constraints: {
    timeLimitMs: number;
    memoryLimitKb: number;
  };
  suggestedTestInputs?: string[];
}

export interface GeneratedSolution {
  language: ProgrammingLanguage;
  code: string;
}

export interface AvailabilityResponse {
  available: boolean;
  reason?: string;
  rateLimit: {
    minIntervalMs: number;
    maxPerMinute: number;
    maxPerSession: number;
  };
  sessionInfo?: {
    sessionId: string;
    messageCount: number;
  };
}

export interface SessionResponse {
  sessionId: string;
  createdAt: string;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  problemReady: boolean;
  problemData?: GeneratedProblem;
  solutionData?: GeneratedSolution;
}

export interface TestCaseResult {
  index: number;
  input: string;
  output: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  isSample?: boolean;
  errorMessage?: string;
}

export interface GenerateTestdataResponse {
  success: boolean;
  testCases: TestCaseResult[];
  totalGenerated: number;
  failedCount: number;
  testdataKey?: string;
  error?: string;
}

export interface PublishProblemParams {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  hint?: string;
  sampleCases: Array<{ input: string; output: string }>;
  difficulty: ProblemDifficulty;
  visibility?: ProblemVisibility;
  tags?: string[];
  allowedLanguages?: ProgrammingLanguage[];
  canViewStdout?: boolean;
  timeLimitMs: number;
  memoryLimitKb: number;
  testdataKey?: string;
  autoTranslate?: boolean;
}

export interface PublishResponse {
  problemId: string;
  displayId: string;
  title: string;
}

// ========== Helpers ==========

function getClientLocale(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie.split(";").map((item) => item.trim());
  for (const entry of cookies) {
    if (!entry) continue;
    const [name, ...rest] = entry.split("=");
    if (name === LOCALE_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

function getDeviceFingerprint(): string | undefined {
  if (typeof window === "undefined") return undefined;
  // Simple fingerprint based on available browser info
  const nav = window.navigator;
  const screen = window.screen;
  const data = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ========== API Functions ==========

/**
 * Check availability and rate limit status
 */
export async function getAvailability(
  accessToken?: string | null,
  sessionId?: string,
): Promise<AvailabilityResponse> {
  const query = new URLSearchParams();
  if (sessionId) query.set("sessionId", sessionId);
  const path = query.toString()
    ? `/ai-problem-creator/availability?${query.toString()}`
    : "/ai-problem-creator/availability";

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const fingerprint = getDeviceFingerprint();
  if (fingerprint) headers["x-device-fingerprint"] = fingerprint;

  return apiRequest<AvailabilityResponse>(path, {
    method: "GET",
    headers,
  });
}

/**
 * Start a new chat session
 */
export async function startSession(
  accessToken?: string | null,
  courseSlug?: string,
): Promise<SessionResponse> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return apiRequest<SessionResponse>("/ai-problem-creator/session/start", {
    method: "POST",
    headers,
    body: JSON.stringify({ courseSlug }),
  });
}

/**
 * Get session problem data
 */
export async function getSessionProblemData(
  sessionId: string,
  accessToken?: string | null,
): Promise<{
  problemData?: GeneratedProblem;
  solutionData?: GeneratedSolution;
}> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return apiRequest(`/ai-problem-creator/session/problem-data?sessionId=${sessionId}`, {
    method: "GET",
    headers,
  });
}

/**
 * Generation mode for problem creator
 * - 'direct': For homepage - generate problem immediately without conversation
 * - 'conversation': For problem page - guided conversation before generation
 */
export type ProblemCreatorMode = 'direct' | 'conversation';

/**
 * Chat with AI (streaming SSE)
 */
export async function chatStream(
  sessionId: string,
  message: string,
  accessToken?: string | null,
  mode?: ProblemCreatorMode,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const urlString = `${baseUrl}/ai-problem-creator/chat?stream=true`;
  const url = baseUrl.startsWith("http")
    ? new URL(urlString)
    : new URL(urlString, window.location.origin);

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "text/event-stream");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const fingerprint = getDeviceFingerprint();
  if (fingerprint) headers.set("x-device-fingerprint", fingerprint);

  const clientLocale = getClientLocale();
  if (clientLocale) headers.set("Accept-Language", clientLocale);

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId, message, mode }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const errorMessage =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return response;
}

/**
 * Chat with AI (non-streaming)
 */
export async function chat(
  sessionId: string,
  message: string,
  accessToken?: string | null,
): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const fingerprint = getDeviceFingerprint();
  if (fingerprint) headers["x-device-fingerprint"] = fingerprint;

  const clientLocale = getClientLocale();
  if (clientLocale) headers["Accept-Language"] = clientLocale;

  return apiRequest<ChatResponse>("/ai-problem-creator/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId, message }),
  });
}

/**
 * Generate test data using solution code
 */
export async function generateTestdata(
  sessionId: string,
  solutionCode: string,
  solutionLanguage: ProgrammingLanguage,
  testInputs: string[],
  accessToken?: string | null,
): Promise<GenerateTestdataResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return apiRequest<GenerateTestdataResponse>("/ai-problem-creator/generate-testdata", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionId,
      solutionCode,
      solutionLanguage,
      testInputs,
    }),
  });
}

export interface GenerateTestdataOnlyParams {
  problemDescription: string;
  inputFormat: string;
  outputFormat: string;
  sampleCases: Array<{ input: string; output: string }>;
  numTestCases?: number;
  problemId?: string;
}

/**
 * Generate test data only (without full chat workflow)
 */
export async function generateTestdataOnly(
  params: GenerateTestdataOnlyParams,
  accessToken?: string | null,
): Promise<GenerateTestdataResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return apiRequest<GenerateTestdataResponse>("/ai-problem-creator/generate-testdata-only", {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
}

/**
 * Publish problem
 */
export async function publishProblem(
  params: PublishProblemParams,
  accessToken?: string | null,
): Promise<PublishResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const query = new URLSearchParams();
  if (params.testdataKey) query.set("testdataKey", params.testdataKey);

  const path = query.toString()
    ? `/ai-problem-creator/publish?${query.toString()}`
    : "/ai-problem-creator/publish";

  return apiRequest<PublishResponse>(path, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      inputFormat: params.inputFormat,
      outputFormat: params.outputFormat,
      hint: params.hint,
      sampleCases: params.sampleCases,
      difficulty: params.difficulty,
      visibility: params.visibility || "PUBLIC",
      tags: params.tags || [],
      allowedLanguages: params.allowedLanguages,
      canViewStdout: params.canViewStdout ?? false,
      timeLimitMs: params.timeLimitMs,
      memoryLimitKb: params.memoryLimitKb,
      autoTranslate: params.autoTranslate,
    }),
  });
}

// ========== SSE Parser Helper ==========

export interface SSEEvent {
  type: "meta" | "chunk" | "problem_ready" | "done" | "error";
  data: unknown;
}

/**
 * Parse SSE stream from chat response
 */
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent: string | null = null;
    let currentData = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        currentData = line.slice(6);
      } else if (line === "" && currentEvent && currentData) {
        try {
          const data = JSON.parse(currentData);
          yield { type: currentEvent as SSEEvent["type"], data };
        } catch {
          yield { type: currentEvent as SSEEvent["type"], data: currentData };
        }
        currentEvent = null;
        currentData = "";
      }
    }
  }
}
