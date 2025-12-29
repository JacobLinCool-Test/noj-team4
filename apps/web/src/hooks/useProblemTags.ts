import { useEffect, useState } from 'react';
import { listProblemTags } from '@/lib/api/problem';

export function useProblemTags(accessToken?: string | null) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTags = async () => {
      try {
        setLoading(true);
        const result = await listProblemTags(accessToken);
        if (!cancelled) {
          setTags(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tags');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return { tags, loading, error };
}
