import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import type { ExamListItem } from "@/types/exam";

type ExamsState = {
  data: ExamListItem[] | null;
  loading: boolean;
  error: string | null;
  unauthorized: boolean;
  notFound: boolean;
  refetch: () => void;
};

export function useCourseExams(
  courseSlug: string | null,
  accessToken: string | null,
): ExamsState {
  const [data, setData] = useState<ExamListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    if (!courseSlug) {
      setData(null);
      setLoading(false);
      setError(null);
      setUnauthorized(false);
      setNotFound(false);
      return () => controller.abort();
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      setNotFound(false);
      try {
        const response = await fetch(`${getApiBaseUrl()}/courses/${courseSlug}/exams`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response
          .json()
          .catch(() => null)
          .then((value) => value as Record<string, unknown> | null);

        if (response.status === 401 || response.status === 403) {
          if (cancelled) return;
          setUnauthorized(true);
          setError(typeof payload?.message === "string" ? payload.message : "未登入或沒有權限查看考試");
          setData(null);
          return;
        }
        if (response.status === 404) {
          if (cancelled) return;
          setNotFound(true);
          setError(typeof payload?.message === "string" ? payload.message : "找不到課程或考試");
          setData(null);
          return;
        }
        if (!response.ok) {
          throw new Error(typeof payload?.message === "string" ? payload.message : "無法取得考試列表");
        }
        if (cancelled) return;
        // API returns { exams: [...] }
        const exams = (payload as { exams?: ExamListItem[] })?.exams ?? [];
        setData(exams);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "取得考試列表失敗";
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
  }, [courseSlug, accessToken, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, unauthorized, notFound, refetch };
}
