import { LOCALE_COOKIE } from "@/i18n/config";

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL;
}

type JsonRecord = Record<string, unknown>;

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

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit & { json?: JsonRecord } = {},
): Promise<T> {
  const { json, headers, body, ...rest } = options;
  const clientLocale = getClientLocale();
  const finalHeaders = new Headers(headers);

  // Avoid forcing CORS preflight for GET/HEAD by setting Content-Type on every request.
  // Only attach Content-Type when we're actually sending JSON.
  if (json && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }
  if (clientLocale && !finalHeaders.has("X-Client-Locale")) {
    finalHeaders.set("X-Client-Locale", clientLocale);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
    body: json ? JSON.stringify(json) : body,
  });

  const maybeJson = await response
    .json()
    .catch(() => null)
    .then((data) => data as JsonRecord | null);

  if (!response.ok) {
    const messageValue = maybeJson?.message;
    const derivedMessage =
      typeof messageValue === "string"
        ? messageValue
        : Array.isArray(messageValue)
          ? messageValue.join("; ")
          : messageValue && typeof messageValue === "object" && "code" in (messageValue as Record<string, unknown>)
            ? String((messageValue as Record<string, unknown>).code)
            : messageValue && typeof messageValue === "object" && "message" in (messageValue as Record<string, unknown>)
              ? String((messageValue as Record<string, unknown>).message)
              : undefined;
    const message = derivedMessage || `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number; data?: JsonRecord };
    error.status = response.status;
    error.data = maybeJson ?? undefined;

    // Log CODE_BLOCKED errors to console for debugging
    if (maybeJson?.error === "CODE_BLOCKED") {
      console.log("%c[AI Code Safety Check] Submission Blocked", "color: red; font-weight: bold; font-size: 14px;");
      console.log("%cThreat Type:", "color: orange; font-weight: bold;", maybeJson.threatType);
      console.log("%cReason:", "color: orange; font-weight: bold;", maybeJson.reason);
      console.log("%cFull Response:", "color: gray;", maybeJson);
    }

    throw error;
  }

  return (maybeJson as T) ?? ({} as T);
}
