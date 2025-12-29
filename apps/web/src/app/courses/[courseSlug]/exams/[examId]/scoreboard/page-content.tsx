'use client';

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCourseExamDetail } from "@/hooks/useCourseExamDetail";
import { getExamScoreboard } from "@/lib/api/exam";
import type { ScoreboardEntry } from "@/types/exam";
import { ExamStatusBadge } from "../../_components/exam-status-badge";

type Props = {
  courseSlug: string;
  examId: string;
};

export function ScoreboardPageContent({ courseSlug, examId }: Props) {
  const { accessToken, user, loading: authLoading } = useAuth();

  const {
    data: course,
    loading: courseLoading,
    unauthorized: courseUnauthorized,
    notFound: courseNotFound,
  } = useCourseDetail(courseSlug, accessToken);

  const {
    data: exam,
    loading: examLoading,
    notFound: examNotFound,
  } = useCourseExamDetail(courseSlug, examId, accessToken);

  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = course?.myRole === "TEACHER" || course?.myRole === "TA";

  const fetchScoreboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExamScoreboard(courseSlug, examId, accessToken);
      setScoreboard(data.scoreboard);
      setProblemIds(data.exam.problemIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入排行榜");
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseSlug, examId]);

  useEffect(() => {
    fetchScoreboard();
  }, [fetchScoreboard]);

  if (courseNotFound || examNotFound) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        找不到考試
      </div>
    );
  }

  if (authLoading || courseLoading || examLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </div>
    );
  }

  if (courseUnauthorized && !user) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        請先登入
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        只有教師和助教可以查看成績
      </div>
    );
  }

  if (!exam) return null;

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
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-600">
            <Link href={`/courses/${courseSlug}/exams/${examId}`} className="text-[#1e5d8f] hover:underline">
              &larr; 返回考試詳情
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#003865]">{exam.title} - 成績排行</h1>
            <ExamStatusBadge status={exam.status} />
          </div>
          <p className="text-sm text-gray-700">
            {new Date(exam.startsAt).toLocaleString()} ~ {new Date(exam.endsAt).toLocaleString()}
          </p>
        </div>

        {/* Scoreboard */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">排行榜</h2>
            <button
              onClick={fetchScoreboard}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              重新整理
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700">{error}</div>
          ) : scoreboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                      排名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      學生
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      總分
                    </th>
                    {problemIds.map((_, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20"
                      >
                        P{index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scoreboard.map((entry, rank) => (
                    <tr key={entry.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-center">
                        {getRankBadge(rank + 1)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {entry.nickname || entry.username}
                        <span className="ml-2 text-xs text-gray-500">@{entry.username}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {entry.totalScore}
                      </td>
                      {problemIds.map((problemId) => {
                        const problem = entry.problems[problemId];
                        return (
                          <td key={problemId} className="px-4 py-4 text-center">
                            {problem && problem.score > 0 ? (
                              <span
                                className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-medium ${
                                  problem.solved
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {problem.score}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500 text-center">
              尚無成績資料
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
