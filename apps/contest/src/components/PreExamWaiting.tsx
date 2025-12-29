'use client';

import { useState, useEffect } from 'react';
import { useExam } from '@/providers/ExamProvider';

export function PreExamWaiting() {
  const { exam, user, time, logout } = useExam();
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (!time?.startsAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const start = new Date(time.startsAt).getTime();
      const diff = Math.max(0, start - now);
      setCountdown(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [time?.startsAt]);

  const hours = Math.floor(countdown / (1000 * 60 * 60));
  const minutes = Math.floor((countdown % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((countdown % (1000 * 60)) / 1000);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {exam?.title || 'NOJ Contest'}
        </h1>
        <p className="text-xl text-gray-600 mb-12">考試即將開始</p>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="font-mono text-6xl sm:text-7xl md:text-8xl font-bold text-blue-600 tracking-wider">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {user && (
          <p className="text-sm text-gray-500 mb-2">{user.username}</p>
        )}
        <button
          onClick={logout}
          className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  );
}
