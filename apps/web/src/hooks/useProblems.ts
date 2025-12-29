import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Problem, ProblemDifficulty, ProblemListResponse } from "@/lib/api/problem";

type UseProblemsParams = {
  q?: string;
  difficulty?: ProblemDifficulty;
  tags?: string[];
  page?: number;
  pageSize?: number;
  accessToken?: string | null;
  scope?: "public" | "mine";
};

type ProblemsState = {
  data: Problem[] | null;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  refetch: () => void;
};

export function useProblems({
  q,
  difficulty,
  tags,
  page = 1,
  pageSize = 20,
  accessToken,
  scope = "public",
}: UseProblemsParams): ProblemsState {
  const [data, setData] = useState<Problem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q.trim());
    if (difficulty) params.set("difficulty", difficulty);
    if (tags && tags.length > 0) params.set("tags", tags.join(","));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (scope) params.set("scope", scope);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [q, difficulty, tags, page, pageSize, scope]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchProblems = async (withAuth: boolean): Promise<"retry-guest" | "ok"> => {
      try {
        const response = await apiRequest<ProblemListResponse>(`/problems${queryString}`, {
          signal: controller.signal,
          headers: withAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        if (cancelled) return "ok";
        setData(response.items);
        setTotal(response.total);
        setCurrentPage(response.page);
        setCurrentPageSize(response.pageSize);
        setError(null);
        return "ok";
      } catch (err) {
        if ((err as Error).name === "AbortError") return "ok";
        let message = err instanceof Error ? err.message : "Failed to load problems";

        // 檢查是否為無效 token
        const isInvalidToken = message.toLowerCase().includes("invalid or expired token");
        // Note: Don't manipulate localStorage directly - let AuthProvider handle token state
        if (withAuth && accessToken && isInvalidToken) {
          return "retry-guest";
        }

        // 過濾 HTML 內容或過長的技術性錯誤訊息
        if (
          message.includes('<!DOCTYPE') ||
          message.includes('<html') ||
          message.includes('<body') ||
          message.length > 200
        ) {
          message = '無法載入題目，請稍後再試';
        }

        if (cancelled) return "ok";
        setError(message);
        setData(null);
        return "ok";
      }
    };

    const run = async () => {
      const result = await fetchProblems(true);
      if (result === "retry-guest") {
        await fetchProblems(false);
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
  }, [queryString, accessToken, version]);

  const refetch = () => setVersion((v) => v + 1);

  return {
    data,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    loading,
    hasFetched,
    error,
    refetch,
  };
}
