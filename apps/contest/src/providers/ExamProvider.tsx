'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { ExamInfo, ExamUser, TimeRemaining } from '@/lib/api';
import { getMe, logout as apiLogout, getTimeRemaining } from '@/lib/api';

interface ExamContextType {
  user: ExamUser | null;
  exam: ExamInfo | null;
  time: TimeRemaining | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshTime: () => Promise<void>;
}

const ExamContext = createContext<ExamContextType | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ExamUser | null>(null);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [time, setTime] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入 Session 資訊
  useEffect(() => {
    async function loadSession() {
      try {
        const data = await getMe();
        setUser(data.user);
        setExam(data.exam);
        setTime(data.time);
        setError(null);
      } catch (err) {
        setError((err as Error).message || 'Failed to load session');
        // 如果 session 無效，重定向到登入頁
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [router]);

  // 每 30 秒更新時間
  useEffect(() => {
    if (!time) return;

    const interval = setInterval(async () => {
      try {
        const newTime = await getTimeRemaining();
        setTime(newTime);

        // 如果考試結束，重定向到結束頁
        if (newTime.ended) {
          router.push('/end');
        }
      } catch {
        // 忽略錯誤
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [time, router]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setExam(null);
      setTime(null);
      router.push('/');
    }
  }, [router]);

  const refreshTime = useCallback(async () => {
    try {
      const newTime = await getTimeRemaining();
      setTime(newTime);
    } catch {
      // 忽略錯誤
    }
  }, []);

  return (
    <ExamContext.Provider
      value={{
        user,
        exam,
        time,
        loading,
        error,
        logout,
        refreshTime,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}
