import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { CourseStatus, CourseSummary } from "@/types/course";

type UseCoursesParams = {
  status?: CourseStatus;
  mine?: boolean;
  term?: string;
  accessToken?: string | null;
  includeProblemCount?: boolean;
  /** If true, skip fetching (useful to wait for auth bootstrap) */
  authLoading?: boolean;
};

type CoursesState = {
  data: CourseSummary[] | null;
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCourses({ status, mine, term, accessToken, includeProblemCount, authLoading }: UseCoursesParams): CoursesState {
  const [data, setData] = useState<CourseSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (mine) params.set("mine", "true");
    if (term) params.set("term", term.trim());
    if (includeProblemCount) params.set("include", "problemCount");
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [status, mine, term, includeProblemCount]);

  useEffect(() => {
    // Wait for auth bootstrap to complete before fetching with auth
    if (authLoading && accessToken) return;

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchCourses = async (withAuth: boolean): Promise<"retry-guest" | "ok"> => {
      try {
        const courses = await apiRequest<CourseSummary[]>(`/courses${queryString}`, {
          signal: controller.signal,
          headers: withAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        if (cancelled) return "ok";
        setData(courses);
        setError(null);
        return "ok";
      } catch (err) {
        if ((err as Error).name === "AbortError") return "ok";
        let message = err instanceof Error ? err.message : "Failed to load courses";
        const isInvalidToken = message.toLowerCase().includes("invalid or expired token");

        // mine=true 需要登入，遇到失效 token 時給友善提示。
        if (withAuth && accessToken && mine && isInvalidToken) {
          if (cancelled) return "ok";
          setError("請重新登入以查看你的課程");
          setData(null);
          return "ok";
        }
        // 若 token 失效且目前不是 mine 篩選，退回未登入狀態再試一次，避免卡在舊 token。
        // Note: Don't manipulate localStorage directly - let AuthProvider handle token state
        if (withAuth && accessToken && !mine && isInvalidToken) {
          return "retry-guest";
        }

        // 過濾 HTML 內容或過長的技術性錯誤訊息
        if (
          message.includes('<!DOCTYPE') ||
          message.includes('<html') ||
          message.includes('<body') ||
          message.length > 200
        ) {
          message = '無法載入課程列表，請稍後再試';
        }

        if (cancelled) return "ok";
        setError(message);
        setData(null);
        return "ok";
      }
    };

    const run = async () => {
      const result = await fetchCourses(true);
      if (result === "retry-guest") {
        await fetchCourses(false);
      }
      if (cancelled) return;
      setLoading(false);
      setHasFetched(true);
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, accessToken, version, mine, authLoading]);

  const refetch = () => setVersion((v) => v + 1);

  return { data, loading, hasFetched, error, refetch };
}
