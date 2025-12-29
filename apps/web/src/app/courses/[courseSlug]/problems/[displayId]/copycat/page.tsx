'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCopycat, useCopycatPairs } from "@/hooks/useCopycat";
import { useI18n } from "@/i18n/useI18n";
import type { ProgrammingLanguage, CopycatPairDetail } from "@/lib/api/copycat";
import { getCopycatPairDetail } from "@/lib/api/copycat";
import { getProblem, type Problem } from "@/lib/api/problem";

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.8) return "text-red-600";
  if (similarity >= 0.5) return "text-amber-600";
  return "text-green-600";
}

function getProgressColor(similarity: number): string {
  if (similarity >= 0.8) return "bg-red-500";
  if (similarity >= 0.5) return "bg-amber-500";
  return "bg-green-500";
}

export default function CopycatPage() {
  const params = useParams();
  const courseSlug = params.courseSlug as string;
  const displayId = params.displayId as string;
  const { messages } = useI18n();

  const { accessToken, user, loading: authLoading } = useAuth();
  const { data: courseData, loading: courseLoading } = useCourseDetail(courseSlug, accessToken);

  // Fetch problem to get UUID
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemLoading, setProblemLoading] = useState(true);

  useEffect(() => {
    if (!displayId || !accessToken) {
      setProblemLoading(false);
      return;
    }

    const fetchProblem = async () => {
      setProblemLoading(true);
      try {
        const data = await getProblem(displayId, accessToken);
        setProblem(data);
      } catch {
        setProblem(null);
      } finally {
        setProblemLoading(false);
      }
    };

    fetchProblem();
  }, [displayId, accessToken]);

  const problemUuid = problem?.id ?? null;

  const getRiskBadge = (similarity: number): React.ReactNode => {
    if (similarity >= 0.8) {
      return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{messages.copycatRiskHigh}</span>;
    }
    if (similarity >= 0.5) {
      return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{messages.copycatRiskMedium}</span>;
    }
    return null;
  };

  const getErrorMessage = (errorCode: string): string => {
    if (errorCode.includes("NO_SUBMISSIONS_TO_ANALYZE")) {
      return messages.copycatErrorNoSubmissions;
    }
    if (errorCode.includes("DOLOS_ANALYSIS_FAILED")) {
      return messages.copycatErrorAnalysisFailed;
    }
    return errorCode;
  };

  const formatLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      cc: "C++",
      cpp: "C++",
      CPP: "C++",
      c: "C",
      C: "C",
      python: "Python",
      PYTHON: "Python",
      java: "Java",
      JAVA: "Java",
    };
    return langMap[lang] || lang;
  };

  const courseId = courseData?.id ?? null;

  const {
    report,
    loading: reportLoading,
    error: reportError,
    triggering,
    trigger,
    deleteReport,
  } = useCopycat(courseId, problemUuid, accessToken);

  const [page, setPage] = useState(1);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [languageFilter, setLanguageFilter] = useState<ProgrammingLanguage | "">("");
  const [selectedPair, setSelectedPair] = useState<CopycatPairDetail | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const handlePairClick = async (pairId: string) => {
    if (!courseId || !problemUuid || !accessToken) return;
    setCompareLoading(true);
    setShowCompareModal(true);
    try {
      const detail = await getCopycatPairDetail(courseId, problemUuid, pairId, accessToken);
      setSelectedPair(detail);
    } catch {
      setSelectedPair(null);
    } finally {
      setCompareLoading(false);
    }
  };

  const closeCompareModal = () => {
    setShowCompareModal(false);
    setSelectedPair(null);
  };

  const { data: pairsData, loading: pairsLoading } = useCopycatPairs(
    report?.status === "SUCCESS" ? courseId : null,
    report?.status === "SUCCESS" ? problemUuid : null,
    accessToken,
    {
      page,
      limit: 20,
      minSimilarity,
      language: languageFilter || undefined,
    },
  );

  // Check permission
  const isStaff = courseData?.myRole === "TEACHER" || courseData?.myRole === "TA";

  if (authLoading || courseLoading || problemLoading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-40 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-yellow-800">{messages.copycatLoginRequired}</p>
          <Link
            href={`/login?next=/courses/${courseSlug}/problems/${displayId}/copycat`}
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.login}
          </Link>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-700">{messages.copycatCourseNotFound}</p>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{messages.copycatNoPermission}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back link */}
        <Link
          href={`/courses/${courseSlug}/problems`}
          className="text-sm text-[#1e5d8f] hover:underline"
        >
          &larr; {messages.copycatBackToProblems}
        </Link>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {messages.copycatTitle}
          </h1>
          <p className="mt-1 text-gray-600">
            {messages.copycatProblemLabel}: {displayId} | {messages.copycatCourseLabel}: {courseData.name}
          </p>
        </div>

        {/* Error */}
        {reportError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">{reportError}</p>
          </div>
        )}

        {/* No report or failed - show trigger button */}
        {(!report || report.status === "FAILED") && !reportLoading && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            {report?.status === "FAILED" && report.errorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-left">
                <p className="text-sm font-medium text-red-700">{messages.copycatPreviousFailed}</p>
                <p className="mt-1 text-sm text-red-600">{getErrorMessage(report.errorMessage)}</p>
              </div>
            )}
            <p className="mb-4 text-gray-600">
              {report?.status === "FAILED"
                ? messages.copycatRetryHint
                : messages.copycatNoReportHint}
            </p>
            <button
              type="button"
              onClick={trigger}
              disabled={triggering}
              className="inline-flex items-center gap-2 rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
            >
              {triggering ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {messages.copycatGenerating}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {messages.copycatGenerateButton}
                </>
              )}
            </button>
          </div>
        )}

        {/* Pending or Running */}
        {(report?.status === "PENDING" || report?.status === "RUNNING") && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-blue-700">
                {report.status === "PENDING" ? messages.copycatPending : messages.copycatRunning}
              </span>
            </div>
            <p className="mt-2 text-sm text-blue-600">
              {messages.copycatAutoRefreshHint}
            </p>
          </div>
        )}

        {/* Success - show report */}
        {report?.status === "SUCCESS" && report.summary && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">{messages.copycatSummaryLanguages}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {report.summary.languages.map(formatLanguage).join(", ")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">{messages.copycatSummaryAvgSimilarity}</p>
                <p className={`mt-1 text-lg font-semibold ${getSimilarityColor(report.summary.avgSimilarity)}`}>
                  {(report.summary.avgSimilarity * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">{messages.copycatSummaryMaxSimilarity}</p>
                <p className={`mt-1 text-lg font-semibold ${getSimilarityColor(report.summary.maxSimilarity)}`}>
                  {(report.summary.maxSimilarity * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">{messages.copycatSummarySuspiciousPairs}</p>
                <p className={`mt-1 text-lg font-semibold ${report.summary.suspiciousPairCount > 0 ? "text-amber-600" : "text-gray-900"}`}>
                  {report.summary.suspiciousPairCount}
                </p>
              </div>
            </div>

            {/* Report info */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>{messages.copycatReportStudents}: {report.studentCount}</span>
                <span>{messages.copycatReportSubmissions}: {report.submissionCount}</span>
                <span>{messages.copycatReportGenerated}: {formatDate(report.completedAt)}</span>
                <span>{messages.copycatReportRequestedBy}: {report.requestedBy.nickname || report.requestedBy.username}</span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">{messages.copycatFilterMinSimilarity}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={minSimilarity}
                  onChange={(e) => {
                    setMinSimilarity(parseFloat(e.target.value));
                    setPage(1);
                  }}
                  className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <span className="w-12 text-sm font-mono">{(minSimilarity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">{messages.copycatFilterLanguage}</label>
                <select
                  value={languageFilter}
                  onChange={(e) => {
                    setLanguageFilter(e.target.value as ProgrammingLanguage | "");
                    setPage(1);
                  }}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">{messages.copycatFilterAll}</option>
                  <option value="C">C</option>
                  <option value="CPP">C++</option>
                  <option value="PYTHON">Python</option>
                  <option value="JAVA">Java</option>
                </select>
              </div>
            </div>

            {/* Pairs table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {messages.copycatTableStudentA}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {messages.copycatTableStudentB}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {messages.copycatTableLanguage}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {messages.copycatTableSimilarity}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {messages.copycatTableRisk}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pairsLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        {messages.copycatLoadingPairs}
                      </td>
                    </tr>
                  )}
                  {!pairsLoading && pairsData?.pairs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        {messages.copycatNoPairs}
                      </td>
                    </tr>
                  )}
                  {pairsData?.pairs.map((pair) => (
                    <tr
                      key={pair.id}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => handlePairClick(pair.id)}
                      title={messages.copycatCompareClickHint}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {pair.leftUser.nickname || pair.leftUser.username}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {pair.rightUser.nickname || pair.rightUser.username}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs">
                          {formatLanguage(pair.language)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full ${getProgressColor(pair.similarity)}`}
                              style={{ width: `${pair.similarity * 100}%` }}
                            />
                          </div>
                          <span className={`font-mono ${getSimilarityColor(pair.similarity)}`}>
                            {(pair.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {getRiskBadge(pair.similarity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pairsData && pairsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {messages.paginationPrev}
                </button>
                <span className="text-sm text-gray-600">
                  {messages.paginationPage
                    .replace("{current}", String(page))
                    .replace("{total}", String(pairsData.pagination.totalPages))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pairsData.pagination.totalPages}
                  className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {messages.paginationNext}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={deleteReport}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {messages.copycatDeleteReport}
              </button>
              <button
                type="button"
                onClick={trigger}
                disabled={triggering}
                className="rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f] disabled:opacity-50"
              >
                {messages.copycatRegenerateReport}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeCompareModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {messages.copycatCompareTitle}
              </h2>
              <button
                type="button"
                onClick={closeCompareModal}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {compareLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  <span className="ml-3 text-gray-600">{messages.copycatCompareLoading}</span>
                </div>
              ) : selectedPair ? (
                <>
                  {/* User Info */}
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">
                        {selectedPair.leftUser.nickname || selectedPair.leftUser.username}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {formatLanguage(selectedPair.language)}
                      </span>
                    </div>
                    <div className={`font-mono font-semibold ${getSimilarityColor(selectedPair.similarity)}`}>
                      {(selectedPair.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="font-medium text-gray-700">
                      {selectedPair.rightUser.nickname || selectedPair.rightUser.username}
                    </div>
                  </div>

                  {/* Code Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-50">
                      <pre className="p-4 text-sm"><code>{selectedPair.leftCode || '// No code available'}</code></pre>
                    </div>
                    <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-50">
                      <pre className="p-4 text-sm"><code>{selectedPair.rightCode || '// No code available'}</code></pre>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  Failed to load code comparison
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeCompareModal}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {messages.copycatCompareClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
