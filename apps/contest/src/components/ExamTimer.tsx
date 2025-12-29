'use client';

import { useState, useEffect } from 'react';
import { useExam } from '@/providers/ExamProvider';

export function ExamTimer() {
  const { time, refreshTime } = useExam();
  const [remaining, setRemaining] = useState<number>(time?.remaining ?? 0);

  useEffect(() => {
    if (time?.remaining !== undefined) {
      setRemaining(time.remaining);
    }
  }, [time?.remaining]);

  // 每秒更新倒數計時
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1000) {
          refreshTime();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshTime]);

  if (!time) {
    return null;
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  const isLow = remaining < 10 * 60 * 1000; // 少於 10 分鐘
  const isCritical = remaining < 5 * 60 * 1000; // 少於 5 分鐘

  return (
    <div
      className={`font-mono text-lg font-semibold px-4 py-2 rounded-lg ${
        isCritical
          ? 'bg-red-100 text-red-700 animate-pulse'
          : isLow
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {time.ended ? (
        <span>已結束</span>
      ) : !time.started ? (
        <span>尚未開始</span>
      ) : (
        <span>
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
          {String(seconds).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}
