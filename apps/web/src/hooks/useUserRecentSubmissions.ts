import { useEffect, useState } from "react";
import { getUserRecentSubmissions, type UserSubmission } from "@/lib/api/user";

type UseUserRecentSubmissionsState = {
  submissions: UserSubmission[];
  loading: boolean;
  error: string | null;
};

export function useUserRecentSubmissions(
  username: string,
  limit: number = 10,
): UseUserRecentSubmissionsState {
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserRecentSubmissions(username, limit)
      .then((data) => {
        if (!cancelled) {
          setSubmissions(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load recent submissions");
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
  }, [username, limit]);

  return { submissions, loading, error };
}
