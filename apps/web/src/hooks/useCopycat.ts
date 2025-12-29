import { useCallback, useEffect, useState } from "react";
import {
  getCopycatReport,
  triggerCopycat,
  getCopycatPairs,
  deleteCopycatReport,
  type CopycatReport,
  type CopycatPairsResponse,
  type ProgrammingLanguage,
} from "@/lib/api/copycat";

interface UseCopycatState {
  report: CopycatReport | null;
  loading: boolean;
  error: string | null;
  triggering: boolean;
  refetch: () => void;
  trigger: () => Promise<void>;
  deleteReport: () => Promise<void>;
}

export function useCopycat(
  courseId: number | null,
  problemId: string | null,
  accessToken: string | null,
): UseCopycatState {
  const [report, setReport] = useState<CopycatReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [version, setVersion] = useState(0);

  // Fetch report
  useEffect(() => {
    if (!courseId || !problemId || !accessToken) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getCopycatReport(courseId, problemId, accessToken);
        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [courseId, problemId, accessToken, version]);

  // Auto-refresh when report is pending or running
  useEffect(() => {
    if (!report) return;
    if (report.status !== "PENDING" && report.status !== "RUNNING") return;

    const interval = setInterval(() => {
      setVersion((v) => v + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [report?.status]);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const trigger = useCallback(async () => {
    if (!courseId || !problemId || !accessToken) return;

    setTriggering(true);
    setError(null);

    try {
      await triggerCopycat(courseId, problemId, accessToken);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger analysis");
    } finally {
      setTriggering(false);
    }
  }, [courseId, problemId, accessToken, refetch]);

  const deleteReportFn = useCallback(async () => {
    if (!courseId || !problemId || !accessToken) return;

    try {
      await deleteCopycatReport(courseId, problemId, accessToken);
      setReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete report");
    }
  }, [courseId, problemId, accessToken]);

  return {
    report,
    loading,
    error,
    triggering,
    refetch,
    trigger,
    deleteReport: deleteReportFn,
  };
}

interface UseCopycatPairsState {
  data: CopycatPairsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCopycatPairs(
  courseId: number | null,
  problemId: string | null,
  accessToken: string | null,
  options?: {
    page?: number;
    limit?: number;
    minSimilarity?: number;
    language?: ProgrammingLanguage;
  },
): UseCopycatPairsState {
  const [data, setData] = useState<CopycatPairsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!courseId || !problemId || !accessToken) return;

    let cancelled = false;

    const fetchPairs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getCopycatPairs(courseId, problemId, accessToken, options);
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pairs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPairs();

    return () => {
      cancelled = true;
    };
  }, [
    courseId,
    problemId,
    accessToken,
    options?.page,
    options?.limit,
    options?.minSimilarity,
    options?.language,
    version,
  ]);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  return { data, loading, error, refetch };
}
