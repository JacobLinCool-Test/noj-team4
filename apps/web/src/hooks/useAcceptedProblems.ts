import { useEffect, useState } from 'react';
import { getSubmissions } from '@/lib/api/submission';

type UseAcceptedProblemsOptions = {
  accessToken?: string | null;
  /** If true, skip fetching (useful to wait for auth bootstrap) */
  authLoading?: boolean;
};

/**
 * Hook to fetch all problems that the user has accepted (AC)
 * Returns a Set of problem IDs for efficient lookup
 */
export function useAcceptedProblems(options: UseAcceptedProblemsOptions | string | null | undefined) {
  // Support both old signature (accessToken) and new object signature
  const { accessToken, authLoading } = typeof options === 'object' && options !== null
    ? options
    : { accessToken: options, authLoading: false };

  const [acceptedProblemIds, setAcceptedProblemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth bootstrap to complete before fetching
    if (authLoading) return;

    if (!accessToken) {
      setAcceptedProblemIds(new Set());
      return;
    }

    const fetchAcceptedProblems = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all AC submissions for the current user
        const response = await getSubmissions(
          {
            mine: true,
            status: 'AC',
            limit: 1000, // Fetch a large number to get all AC'd problems
          },
          accessToken
        );

        // Extract unique problem IDs from submissions
        const problemIds = new Set<string>();
        response.submissions.forEach((submission) => {
          if (submission.problemId) {
            problemIds.add(submission.problemId);
          }
        });

        setAcceptedProblemIds(problemIds);
      } catch (err) {
        console.error('Failed to fetch accepted problems:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch accepted problems');
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedProblems();
  }, [accessToken, authLoading]);

  return {
    acceptedProblemIds,
    loading,
    error,
  };
}
