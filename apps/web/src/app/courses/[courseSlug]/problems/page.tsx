'use client';

import Link from "next/link";
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourse } from "@/contexts/CourseContext";
import { useCourseProblems } from "@/hooks/useCourseProblems";
import type { ProblemDifficulty } from "@/lib/api/problem";

const DIFFICULTY_CONFIG: Record<ProblemDifficulty, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  UNKNOWN: {
    label: "未知",
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
    borderColor: "border-slate-200",
  },
  EASY: {
    label: "簡單",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
  MEDIUM: {
    label: "中等",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  HARD: {
    label: "困難",
    bgColor: "bg-rose-100",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
  },
};

export default function CourseProblemsPage() {
  const params = useParams();
  const courseSlug = params.courseSlug as string;
  const { messages, locale } = useI18n();
  const { accessToken } = useAuth();
  const { course, isStaff } = useCourse();

  const [page, setPage] = useState(1);
  const [filterDifficulty, setFilterDifficulty] = useState<ProblemDifficulty | "ALL">("ALL");

  const { data, loading, error, refetch } = useCourseProblems({
    courseSlug,
    page,
    pageSize: 12,
    accessToken,
  });

  const difficultyLabels = useMemo<Record<ProblemDifficulty, string>>(
    () => ({
      UNKNOWN: messages.problemsDifficultyUnknown ?? "未知",
      EASY: messages.problemsDifficultyEasy ?? "簡單",
      MEDIUM: messages.problemsDifficultyMedium ?? "中等",
      HARD: messages.problemsDifficultyHard ?? "困難",
    }),
    [messages],
  );

  // Filter problems by difficulty
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (filterDifficulty === "ALL") return data.items;
    return data.items.filter((p) => p.difficulty === filterDifficulty);
  }, [data?.items, filterDifficulty]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Loading skeleton
  if (loading && (!data || data.items.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 rounded-lg bg-slate-200 skeleton-shimmer" />
          <div className="h-10 w-28 rounded-lg bg-slate-200 skeleton-shimmer" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="bg-slate-50 px-4 py-3">
            <div className="flex gap-4">
              <div className="h-4 w-16 rounded bg-slate-200 skeleton-shimmer" />
              <div className="h-4 w-24 rounded bg-slate-200 skeleton-shimmer" />
              <div className="h-4 w-16 rounded bg-slate-200 skeleton-shimmer" />
              <div className="h-4 w-16 rounded bg-slate-200 skeleton-shimmer" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="h-5 w-14 rounded bg-slate-100 skeleton-shimmer" />
                <div className="h-5 w-48 rounded bg-slate-100 skeleton-shimmer" />
                <div className="h-5 w-16 rounded-full bg-slate-100 skeleton-shimmer" />
                <div className="h-5 w-20 rounded-full bg-slate-100 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-rose-800 font-medium">無法載入題目列表</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            題目
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {data?.total ?? 0} 道題目
          </p>
        </div>
        {isStaff && (
          <Link
            href={`/courses/${courseSlug}/problems/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#003865]/25 transition-all hover:bg-[#002a4d] hover:shadow-xl hover:shadow-[#003865]/30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增題目
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">難度篩選：</span>
        <button
          type="button"
          onClick={() => setFilterDifficulty("ALL")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
            filterDifficulty === "ALL"
              ? "bg-[#003865] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          全部
        </button>
        {(["EASY", "MEDIUM", "HARD"] as ProblemDifficulty[]).map((diff) => {
          const config = DIFFICULTY_CONFIG[diff];
          const isActive = filterDifficulty === diff;
          return (
            <button
              key={diff}
              type="button"
              onClick={() => setFilterDifficulty(diff)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? `${config.bgColor} ${config.textColor} ring-2 ring-offset-1 ${config.borderColor.replace('border', 'ring')}`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {difficultyLabels[diff]}
            </button>
          );
        })}
      </div>

      {/* Problems List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {filterDifficulty === "ALL" ? "尚無題目" : "沒有符合條件的題目"}
          </h3>
          <p className="mt-2 text-slate-500">
            {filterDifficulty === "ALL"
              ? "課程題目將會顯示在這裡"
              : "請嘗試其他篩選條件"}
          </p>
          {isStaff && filterDifficulty === "ALL" && (
            <Link
              href={`/courses/${courseSlug}/problems/new`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增第一道題目
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  編號
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  題目名稱
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  難度
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  標籤
                </th>
                {isStaff && (
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((problem) => {
                const diffConfig = DIFFICULTY_CONFIG[problem.difficulty];
                return (
                  <tr
                    key={problem.id}
                    className="group transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm font-medium text-slate-600 group-hover:bg-[#003865]/10 group-hover:text-[#003865]">
                        #{problem.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/courses/${courseSlug}/problems/${problem.displayId}`}
                        className="font-medium text-slate-900 hover:text-[#003865]"
                      >
                        {problem.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${diffConfig.bgColor} ${diffConfig.textColor}`}>
                        {difficultyLabels[problem.difficulty]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-[#003865]/10 px-2 py-0.5 text-xs font-medium text-[#003865]"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags?.length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{problem.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    {isStaff && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/courses/${courseSlug}/problems/${problem.displayId}/edit`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            編輯
                          </Link>
                          <Link
                            href={`/courses/${courseSlug}/problems/${problem.displayId}/copycat`}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            抄襲
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            上一頁
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`h-10 w-10 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? "bg-[#003865] text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={!canNext}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一頁
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
