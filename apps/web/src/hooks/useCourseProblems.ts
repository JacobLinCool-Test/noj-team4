import { useEffect, useMemo, useState } from "react";
import { listCourseProblems, type CourseProblemListResponse } from "@/lib/api/course-problem";
import type { ProblemDifficulty } from "@/lib/api/problem";

type UseCourseProblemsParams = {
  courseSlug: string;
  q?: string;
  difficulty?: ProblemDifficulty;
  page?: number;
  pageSize?: number;
  accessToken?: string | null;
};

export function useCourseProblems({
  courseSlug,
  q,
  difficulty,
  page = 1,
  pageSize = 10,
  accessToken,
}: UseCourseProblemsParams) {
  const [data, setData] = useState<CourseProblemListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const params = useMemo(
    () => ({
      q: q?.trim() || undefined,
      difficulty,
      page,
      pageSize,
    }),
    [q, difficulty, page, pageSize],
  );

  useEffect(() => {
    let cancelled = false;
    if (!courseSlug) return;
    setLoading(true);
    setError(null);

    listCourseProblems(courseSlug, params, accessToken)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load course problems");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseSlug, accessToken, params, version]);

  const refetch = () => setVersion((v) => v + 1);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
