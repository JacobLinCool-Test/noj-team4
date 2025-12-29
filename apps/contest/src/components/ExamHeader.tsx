'use client';

import Link from 'next/link';
import { useExam } from '@/providers/ExamProvider';
import { ExamTimer } from './ExamTimer';

export function ExamHeader() {
  const { exam, user, logout, loading } = useExam();

  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-6 w-24 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 左側：考試標題 */}
          <div className="flex items-center gap-6">
            <Link
              href="/problems"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {exam?.title || 'NOJ Contest'}
            </Link>

            {/* 導航連結 */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/problems"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                題目
              </Link>
              <Link
                href="/submissions"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                提交紀錄
              </Link>
              {exam?.scoreboardVisible && (
                <Link
                  href="/scoreboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  排行榜
                </Link>
              )}
            </nav>
          </div>

          {/* 右側：計時器和使用者 */}
          <div className="flex items-center gap-4">
            <ExamTimer />

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {user?.displayName || user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
