import { apiRequest, getApiBaseUrl } from "../api";
import { LOCALE_COOKIE } from "@/i18n/config";

export type AiAvailability = {
  canUse: boolean;
  reason?: string;
  scope: {
    problemStatement: boolean;
    userCode: boolean;
    compileError: boolean;
    judgeSummary: boolean;
  };
  provider: "OPENAI" | "GEMINI";
  model: string | null;
  rateLimit?: {
    perMinute: number;
    perHour: number;
  };
};

export type AiChatRequest = {
  message: string;
  conversationId?: string;
  attachLatestSubmission?: boolean;
  stream?: boolean;
  currentProblemId?: string;
};

export type ConversationHistory = {
  conversation: {
    id: string;
    lastActiveAt: string;
  } | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

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

// General availability (no problem context)
export async function getGeneralAiAvailability(
  accessToken?: string | null,
): Promise<AiAvailability> {
  return apiRequest<AiAvailability>("/ai-assistant/availability", {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// Get latest global conversation with messages
export async function getLatestConversation(
  accessToken?: string | null,
): Promise<ConversationHistory> {
  return apiRequest<ConversationHistory>("/ai-assistant/conversation/latest", {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// Start a new conversation (marks existing as ended)
export async function startNewConversation(
  accessToken?: string | null,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/ai-assistant/conversation/new", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// General chat (no problem context)
export async function startGeneralAiChatStream(
  payload: AiChatRequest,
  accessToken?: string | null,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const urlString = `${baseUrl}/ai-assistant/chat`;
  // Handle relative URLs by using window.location.origin as base
  const url = baseUrl.startsWith("http")
    ? new URL(urlString)
    : new URL(urlString, window.location.origin);
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "text/plain");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const clientLocale = getClientLocale();
  if (clientLocale) headers.set("X-Client-Locale", clientLocale);

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response;
}

// Problem-specific availability
export async function getAiAvailability(
  problemId: string,
  accessToken?: string | null,
  homeworkId?: string,
): Promise<AiAvailability> {
  const query = new URLSearchParams();
  if (homeworkId) query.set("homeworkId", homeworkId);
  const path = query.toString()
    ? `/ai-assistant/problems/${problemId}/availability?${query.toString()}`
    : `/ai-assistant/problems/${problemId}/availability`;

  return apiRequest<AiAvailability>(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// Problem-specific chat
export async function startAiChatStream(
  problemId: string,
  payload: AiChatRequest,
  accessToken?: string | null,
  homeworkId?: string,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const urlString = `${baseUrl}/ai-assistant/problems/${problemId}/chat`;
  // Handle relative URLs by using window.location.origin as base
  const url = baseUrl.startsWith("http")
    ? new URL(urlString)
    : new URL(urlString, window.location.origin);
  if (homeworkId) url.searchParams.set("homeworkId", homeworkId);
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "text/plain");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const clientLocale = getClientLocale();
  if (clientLocale) headers.set("X-Client-Locale", clientLocale);

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response;
}
