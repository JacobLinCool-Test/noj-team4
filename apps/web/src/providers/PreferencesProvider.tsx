'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useAuth } from './AuthProvider';
import {
  type UserPreferences,
  DEFAULT_PREFERENCES,
  updatePreferences as apiUpdatePreferences,
} from '@/lib/api/user';

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, accessToken } = useAuth();
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  // Sync preferences from user when it changes
  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(user.preferences as Partial<UserPreferences>),
      });
    } else {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [user]);

  const updatePreferences = useCallback(
    async (newPrefs: Partial<UserPreferences>) => {
      // Optimistic update
      setPreferences((prev) => ({ ...prev, ...newPrefs }));

      // Skip API call if not logged in
      if (!accessToken) return;

      setIsLoading(true);
      try {
        const updated = await apiUpdatePreferences(newPrefs, accessToken);
        setPreferences({ ...DEFAULT_PREFERENCES, ...updated });
      } catch {
        // Silently revert on error - preference sync is non-critical
        if (user?.preferences) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...(user.preferences as Partial<UserPreferences>),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, user]
  );

  const value = useMemo(
    () => ({ preferences, updatePreferences, isLoading }),
    [preferences, updatePreferences, isLoading]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
