import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import type { CourseDetail } from "@/types/course";

type CourseDetailState = {
  data: CourseDetail | null;
  loading: boolean;
  error: string | null;
  unauthorized: boolean;
  notFound: boolean;
  refetch: () => void;
  setData: (next: CourseDetail | null) => void;
};

export function useCourseDetail(courseSlug: string | null, accessToken: string | null): CourseDetailState {
  const [data, setData] = useState<CourseDetail | null>(null);
  // Start with loading=true to prevent flash of content before fetch starts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [version, setVersion] = useState(0);

  const url = useMemo(() => {
    if (!courseSlug) return null;
    return `${getApiBaseUrl()}/courses/${courseSlug}`;
  }, [courseSlug]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    if (!url) {
      setLoading(false);
      return undefined;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      setNotFound(false);
      setData(null);

      try {
        const fetchWithAuth = async () =>
          fetch(url, {
            headers: accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : undefined,
            credentials: "include",
            signal: controller.signal,
          });
        const handleResponse = async (response: Response) => {
          const payload = await response
            .json()
            .catch(() => null)
            .then((value) => value as Record<string, unknown> | null);

          if (response.status === 401) {
            if (cancelled) return { handled: true };
            setUnauthorized(true);
            setError(typeof payload?.message === "string" ? payload.message : null);
            setLoading(false);
            return { handled: true };
          }

          if (response.status === 404) {
            if (cancelled) return { handled: true };
            setNotFound(true);
            setError(typeof payload?.message === "string" ? payload.message : null);
            setLoading(false);
            return { handled: true };
          }

          if (!response.ok) {
            throw new Error(
              typeof payload?.message === "string" ? payload.message : `Failed to load course (${response.status})`,
            );
          }

          if (cancelled) return { handled: true };
          setData(payload as CourseDetail);
          return { handled: true };
        };

        // primary request (with Authorization header if present)
        const primaryResponse = await fetchWithAuth();
        if (primaryResponse.status === 401 && accessToken) {
          // Fallback as unauthenticated viewer to avoid blocking due to stale token
          const fallbackResponse = await fetch(url, {
            credentials: "include",
            signal: controller.signal,
          });
          if (fallbackResponse.status !== 401) {
            setUnauthorized(true);
            await handleResponse(fallbackResponse);
            return;
          }
        }

        await handleResponse(primaryResponse);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load course";
        setError(message);
        setData(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, url, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  const replaceData = useCallback((next: CourseDetail | null) => {
    setData(next);
    if (next) {
      setUnauthorized(false);
      setNotFound(false);
      setError(null);
    }
  }, []);

  return { data, loading, error, unauthorized, notFound, refetch, setData: replaceData };
}
