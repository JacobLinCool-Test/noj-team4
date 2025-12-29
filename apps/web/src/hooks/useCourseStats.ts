import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";

export interface CourseStats {
  memberCount: number;
  problemCount: number;
  homeworkCount: number;
  totalSubmissions: number;
  myProgress?: {
    solvedCount: number;
    attemptedCount: number;
    submissionCount: number;
  };
  recentActivity?: {
    submissionsToday: number;
    activeStudents: number;
  };
}

interface UseCourseStatsOptions {
  enabled?: boolean;
}

interface UseCourseStatsResult {
  data: CourseStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCourseStats(
  courseSlug: string | null,
  accessToken: string | null,
  options: UseCourseStatsOptions = {},
): UseCourseStatsResult {
  const { enabled = true } = options;

  const [data, setData] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!courseSlug || !accessToken || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest<CourseStats>(`/courses/${courseSlug}/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch course stats";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [courseSlug, accessToken, enabled]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
  };
}
