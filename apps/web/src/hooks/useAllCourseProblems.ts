import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Problem, ProblemDifficulty } from "@/lib/api/problem";

interface CourseSummary {
  id: number;
  slug: string;
  name: string;
  term: string;
}

export interface ProblemWithCourses extends Problem {
  courses: CourseSummary[];
}

interface AllCourseProblemsResponse {
  items: ProblemWithCourses[];
  total: number;
  page: number;
  pageSize: number;
}

interface UseAllCourseProblemsOptions {
  q?: string;
  difficulty?: ProblemDifficulty;
  courseSlug?: string | null;
  page?: number;
  pageSize?: number;
  accessToken?: string | null;
}

export function useAllCourseProblems(options: UseAllCourseProblemsOptions) {
  const { accessToken, ...params } = options;
  const [data, setData] = useState<AllCourseProblemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q.trim());
    if (params.difficulty) queryParams.set("difficulty", params.difficulty);
    if (params.courseSlug) queryParams.set("courseSlug", params.courseSlug);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));
    const qs = queryParams.toString();
    return qs ? `?${qs}` : "";
  }, [params.q, params.difficulty, params.courseSlug, params.page, params.pageSize]);

  useEffect(() => {
    if (!accessToken) {
      setData(null);
      setError(null);
      setHasFetched(true);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const result = await apiRequest<AllCourseProblemsResponse>(
          `/courses/my-courses/problems${queryString}`,
          {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (cancelled) return;
        setData(result);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        let message = err instanceof Error ? err.message : "Failed to load course problems";

        if (
          message.includes("<!DOCTYPE") ||
          message.includes("<html") ||
          message.includes("<body") ||
          message.length > 200
        ) {
          message = "無法載入課程題目，請稍後再試";
        }

        if (cancelled) return;
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasFetched(true);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, queryString, version]);

  const refetch = () => setVersion((v) => v + 1);

  return {
    data: data?.items || null,
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    loading,
    hasFetched,
    error,
    refetch,
  };
}
