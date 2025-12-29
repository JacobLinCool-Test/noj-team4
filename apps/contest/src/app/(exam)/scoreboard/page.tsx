'use client';

import { useEffect, useState } from 'react';
import { getScoreboard, type ScoreboardEntry } from '@/lib/api';
import { useExam } from '@/providers/ExamProvider';

export default function ScoreboardPage() {
  const { exam } = useExam();
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const data = await getScoreboard();
        setScoreboard(data.scoreboard);
      } catch (err) {
        setError((err as Error).message || 'Failed to load scoreboard');
      } finally {
        setLoading(false);
      }
    }

    if (exam?.scoreboardVisible) {
      fetchScoreboard();
    } else {
      setLoading(false);
    }
  }, [exam?.scoreboardVisible]);

  if (!exam?.scoreboardVisible) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg">
        排行榜未開放
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">排行榜</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200">
              <div className="h-5 w-full bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        {error}
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-bold">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-800 font-bold">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-300 text-orange-900 font-bold">
          3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 text-gray-600 font-medium">
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">排行榜</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                排名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                參賽者
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                總分
              </th>
              {scoreboard[0]?.problems.map((_, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                >
                  P{index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scoreboard.map((entry) => (
              <tr
                key={entry.userId}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {getRankBadge(entry.rank)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {entry.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                  {entry.totalScore}
                </td>
                {entry.problems.map((problem, index) => (
                  <td
                    key={index}
                    className="px-4 py-4 whitespace-nowrap text-center"
                  >
                    {problem.score > 0 ? (
                      <span
                        className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-medium ${
                          problem.score === 100
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {problem.score}
                      </span>
                    ) : problem.attempts > 0 ? (
                      <span className="text-red-500 text-xs">
                        (-{problem.attempts})
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {scoreboard.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            尚無排行榜資料
          </div>
        )}
      </div>
    </div>
  );
}
