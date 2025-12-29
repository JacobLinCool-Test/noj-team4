import { useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "@/lib/api/user";

type UseUserProfileState = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export function useUserProfile(username: string): UseUserProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserProfile(username)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load user profile");
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

  return { profile, loading, error };
}
