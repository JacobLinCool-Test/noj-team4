'use client';

import { useState, useEffect } from 'react';
import { useExam } from '@/providers/ExamProvider';
import { ExamHeader } from './ExamHeader';
import { PreExamWaiting } from './PreExamWaiting';

export function ExamContent({ children }: { children: React.ReactNode }) {
  const { time, loading, refreshTime } = useExam();
  const [hasStarted, setHasStarted] = useState(false);

  // Check if exam has started based on local time
  useEffect(() => {
    if (!time?.startsAt) return;

    const checkStarted = () => {
      const now = new Date().getTime();
      const start = new Date(time.startsAt).getTime();
      const remaining = start - now;
      // Transition when remaining time is less than 1 second
      // This ensures we never show 0:00 on the countdown
      if (remaining < 1000) {
        setHasStarted(true);
        refreshTime(); // Refresh from server to sync state
      }
    };

    checkStarted();
    const interval = setInterval(checkStarted, 1000);

    return () => clearInterval(interval);
  }, [time?.startsAt, refreshTime]);

  // Also update from server's started flag
  useEffect(() => {
    if (time?.started) {
      setHasStarted(true);
    }
  }, [time?.started]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // Show waiting screen if exam hasn't started
  if (time && !hasStarted) {
    return <PreExamWaiting />;
  }

  // Show normal exam content
  return (
    <>
      <ExamHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </>
  );
}
