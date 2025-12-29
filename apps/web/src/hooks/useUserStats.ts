import { useEffect, useState } from "react";
import { getUserStats, type UserStats } from "@/lib/api/user";

type UseUserStatsState = {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
};

export function useUserStats(username: string): UseUserStatsState {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserStats(username)
      .then((data) => {
        if (!cancelled) {
          setStats(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load user stats");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return { stats, loading, error };
}
