'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  preferences?: Record<string, unknown>;
};

type AuthContextState = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: { identifier: string; password: string }) => Promise<void>;
  register: (payload: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SILENT_REFRESH_INTERVAL = 10 * 60 * 1000;

function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function isAuthError(err: unknown) {
  const status =
    typeof (err as { status?: number } | undefined)?.status === "number"
      ? (err as { status?: number }).status
      : null;
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("jwt")
  );
}

export function useAuthProvider(): AuthContextState {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const persistAccessToken = useCallback((token: string | null) => {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    persistAccessToken(null);
  }, [persistAccessToken]);

  const refreshSilently = useCallback(
    async ({ clearOnAuthError }: { clearOnAuthError?: boolean } = {}) => {
      try {
        const data = await apiRequest<{ accessToken: string; user: User }>("/auth/refresh", {
          method: "POST",
        });
        setAccessToken(data.accessToken);
        persistAccessToken(data.accessToken);
        setUser(data.user);
        setError(null);
        return true;
      } catch (err) {
        if (clearOnAuthError && isAuthError(err)) {
          clearAuthState();
        }
        const message = err instanceof Error ? err.message : "Refresh failed";
        setError(message);
        return false;
      }
    },
    [clearAuthState, persistAccessToken],
  );

  const fetchMe = useCallback(
    async (token: string | null) => {
      if (!token) {
        clearAuthState();
        return false;
      }
      try {
        const me = await apiRequest<User>("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(me);
        setError(null);
        return true;
      } catch (err) {
        if (isAuthError(err)) {
          const refreshed = await refreshSilently({ clearOnAuthError: true });
          if (refreshed) return true;
          clearAuthState();
        } else {
          const message = err instanceof Error ? err.message : "Failed to verify session";
          setError(message);
          // Keep existing user/token so we can retry after transient issues.
        }
        return false;
      }
    },
    [clearAuthState, refreshSilently],
  );

  const login = useCallback(
    async ({ identifier, password }: { identifier: string; password: string }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<{ accessToken: string; user: User }>("/auth/login", {
          method: "POST",
          json: { identifier, password },
        });
        setAccessToken(data.accessToken);
        persistAccessToken(data.accessToken);
        setUser(data.user);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persistAccessToken],
  );

  const register = useCallback(
    async ({ username, email, password }: { username: string; email: string; password: string }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<{ accessToken: string; user: User }>("/auth/register", {
          method: "POST",
          json: { username, email, password },
        });
        setAccessToken(data.accessToken);
        persistAccessToken(data.accessToken);
        setUser(data.user);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Register failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persistAccessToken],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ accessToken: string; user: User }>("/auth/refresh", {
        method: "POST",
      });
      setAccessToken(data.accessToken);
      persistAccessToken(data.accessToken);
      setUser(data.user);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
      if (isAuthError(err)) {
        clearAuthState();
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, persistAccessToken]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (accessToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null);
      }
    } finally {
      clearAuthState();
      setLoading(false);
    }
  }, [accessToken, clearAuthState]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const bootstrap = async () => {
      setLoading(true);
      const token = getStoredAccessToken();
      if (token) {
        setAccessToken(token);
        const ok = await fetchMe(token);
        if (!ok) {
          await refreshSilently({ clearOnAuthError: true });
        }
      } else {
        await refreshSilently({ clearOnAuthError: false });
      }
      setLoading(false);
    };

    bootstrap().catch(() => setLoading(false));
  }, [fetchMe, refreshSilently]);

  useEffect(() => {
    if (!accessToken) return;
    const intervalId = setInterval(() => {
      refreshSilently({ clearOnAuthError: true });
    }, SILENT_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [accessToken, refreshSilently]);

  return useMemo(
    () => ({
      user,
      accessToken,
      loading,
      error,
      login,
      register,
      logout,
      refresh,
    }),
    [user, accessToken, loading, error, login, register, logout, refresh],
  );
}
