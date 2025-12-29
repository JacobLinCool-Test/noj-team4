'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseProblems } from "@/hooks/useCourseProblems";
import type { ProblemDifficulty } from "@/lib/api/problem";

type CourseProblemsSectionProps = {
  courseSlug: string;
  isStaff: boolean;
  showViewAll?: boolean;
};

const DIFFICULTY_STYLES: Record<ProblemDifficulty, string> = {
  UNKNOWN: "bg-gray-100 text-gray-700",
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

export function CourseProblemsSection({
  courseSlug,
  isStaff,
  showViewAll = false,
}: CourseProblemsSectionProps) {
  const { messages } = useI18n();
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);

  const { data, loading, error } = useCourseProblems({
    courseSlug,
    page,
    pageSize: 10,
    accessToken,
  });

  const difficultyLabels: Record<ProblemDifficulty, string> = useMemo(
    () => ({
      UNKNOWN: messages.problemsDifficultyUnknown,
      EASY: messages.problemsDifficultyEasy,
      MEDIUM: messages.problemsDifficultyMedium,
      HARD: messages.problemsDifficultyHard,
    }),
    [messages],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#003865]">{messages.courseProblemsTitle}</h3>
          <p className="text-xs text-gray-600">{messages.courseProblemsSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showViewAll ? (
            <Link
              href={`/courses/${courseSlug}/problems`}
              className="text-sm font-medium text-[#1e5d8f] hover:underline"
            >
              {messages.courseProblemsViewAll}
            </Link>
          ) : null}
          {isStaff ? (
            <Link
              href={`/courses/${courseSlug}/problems/new`}
              className="rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
            >
              {messages.courseProblemsNew}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-md bg-gray-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{messages.courseProblemsError}</p>
            <p className="mt-1 font-mono text-xs text-red-600">{error}</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {messages.courseProblemsEmpty}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      {messages.problemsTableId}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      {messages.problemsTableTitle}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      {messages.problemsTableDifficulty}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      {messages.problemsTableTags}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      {messages.problemsTableCreatedAt}
                    </th>
                    {isStaff && (
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.items.map((problem) => (
                    <tr key={problem.id} className="transition hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/courses/${courseSlug}/problems/${problem.displayId}`}
                          className="font-mono text-xs font-semibold text-[#003865] hover:underline"
                        >
                          {problem.displayId}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/courses/${courseSlug}/problems/${problem.displayId}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#003865]"
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[problem.difficulty]}`}>
                          {difficultyLabels[problem.difficulty]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {problem.tags?.length > 0 ? (
                            problem.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex rounded-full bg-[#003865] px-2 py-0.5 text-xs text-white"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {new Date(problem.createdAt).toLocaleDateString()}
                      </td>
                      {isStaff && (
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Link
                              href={`/courses/${courseSlug}/problems/${problem.displayId}/copycat`}
                              className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                              title={messages.copycatTitle}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              {messages.copycatButtonLabel}
                            </Link>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={!canPrev}
                  className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
                >
                  {messages.paginationPrev}
                </button>
                <span>
                  {messages.paginationPage
                    .replace("{current}", String(page))
                    .replace("{total}", String(totalPages))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={!canNext}
                  className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
                >
                  {messages.paginationNext}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
