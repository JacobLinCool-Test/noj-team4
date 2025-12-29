"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  listBlockedSubmissions,
  getBlockedSubmission,
  type BlockedSubmission,
  type Pagination,
} from "@/lib/api/admin";

const THREAT_TYPE_COLORS: Record<string, string> = {
  SHELL_ESCAPE: "bg-red-100 text-red-800",
  FILE_READ: "bg-orange-100 text-orange-800",
  FORK_BOMB: "bg-red-100 text-red-800",
  REVERSE_SHELL: "bg-red-100 text-red-800",
  SANDBOX_ESCAPE: "bg-red-100 text-red-800",
  NETWORK_ACCESS: "bg-yellow-100 text-yellow-800",
  ENV_ACCESS: "bg-yellow-100 text-yellow-800",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  SUBMIT: "Submit",
  TEST: "Test",
  EXAM_SUBMIT: "Exam",
};

const LANGUAGE_LABELS: Record<string, string> = {
  C: "C",
  CPP: "C++",
  JAVA: "Java",
  PYTHON: "Python",
};

export default function AdminBlockedSubmissionsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { messages: t } = useI18n();

  const [submissions, setSubmissions] = useState<BlockedSubmission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [threatTypeFilter, setThreatTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail modal
  const [selectedSubmission, setSelectedSubmission] = useState<BlockedSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  const fetchSubmissions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await listBlockedSubmissions(
        {
          page,
          limit,
          threatType: threatTypeFilter || undefined,
        },
        accessToken
      );
      setSubmissions(data.submissions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, threatTypeFilter, t.errorGeneric]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin || !accessToken) return;
    fetchSubmissions();
  }, [authLoading, user, isAdmin, accessToken, router, fetchSubmissions]);

  const handleViewDetail = async (id: string) => {
    if (!accessToken) return;
    setDetailLoading(true);
    try {
      const detail = await getBlockedSubmission(id, accessToken);
      setSelectedSubmission(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
            <div className="mt-8 h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t.blockedSubmissionsAccessDenied || "Access denied. Admin privileges required."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.blockedSubmissionsBackToAdmin || "Back to Admin"}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t.blockedSubmissionsTitle || "Blocked Submissions"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.blockedSubmissionsSubtitle || "Code submissions blocked by AI safety check."}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t.blockedSubmissionsThreatType || "Threat Type"}:
            </label>
            <select
              value={threatTypeFilter}
              onChange={(e) => {
                setThreatTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            >
              <option value="">{t.blockedSubmissionsAllTypes || "All Types"}</option>
              <option value="SHELL_ESCAPE">Shell Escape</option>
              <option value="FILE_READ">File Read</option>
              <option value="FORK_BOMB">Fork Bomb</option>
              <option value="REVERSE_SHELL">Reverse Shell</option>
              <option value="SANDBOX_ESCAPE">Sandbox Escape</option>
              <option value="NETWORK_ACCESS">Network Access</option>
              <option value="ENV_ACCESS">Env Access</option>
            </select>
          </div>
          <button
            onClick={() => {
              setThreatTypeFilter("");
              setPage(1);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t.blockedSubmissionsClearFilters || "Clear Filters"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsTime || "Time"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsUser || "User"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsProblem || "Problem"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsType || "Type"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsThreat || "Threat"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsLanguage || "Language"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t.blockedSubmissionsActions || "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t.blockedSubmissionsEmpty || "No blocked submissions found."}
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {sub.user ? (
                          <span className="text-gray-900">{sub.user.username}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {sub.problem ? (
                          <Link
                            href={`/problems/${sub.problem.displayId}`}
                            className="text-[#003865] hover:underline"
                          >
                            {sub.problem.displayId}
                          </Link>
                        ) : sub.examId ? (
                          <span className="text-gray-500">Exam: {sub.examId}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {SOURCE_TYPE_LABELS[sub.sourceType] || sub.sourceType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            THREAT_TYPE_COLORS[sub.threatType] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {sub.threatType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {LANGUAGE_LABELS[sub.language] || sub.language}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewDetail(sub.id)}
                          className="text-[#003865] hover:underline"
                        >
                          {t.blockedSubmissionsViewDetail || "View"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-500">
                {t.blockedSubmissionsShowing || "Showing"} {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, pagination.total)} {t.blockedSubmissionsOf || "of"}{" "}
                {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.blockedSubmissionsPrev || "Previous"}
                </button>
                <span className="text-sm text-gray-700">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.blockedSubmissionsNext || "Next"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {(selectedSubmission || detailLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-xl">
              {detailLoading ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 w-32 rounded bg-gray-200" />
                    <div className="h-48 rounded bg-gray-200" />
                  </div>
                </div>
              ) : selectedSubmission ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {t.blockedSubmissionsDetailTitle || "Blocked Submission Detail"}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedSubmission.id}</p>
                    </div>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <div className="text-xs font-medium uppercase text-gray-500">
                          {t.blockedSubmissionsUser || "User"}
                        </div>
                        <div className="mt-1 text-sm text-gray-900">
                          {selectedSubmission.user?.username || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase text-gray-500">
                          {t.blockedSubmissionsTime || "Time"}
                        </div>
                        <div className="mt-1 text-sm text-gray-900">
                          {formatDate(selectedSubmission.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase text-gray-500">
                          {t.blockedSubmissionsThreat || "Threat"}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              THREAT_TYPE_COLORS[selectedSubmission.threatType] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {selectedSubmission.threatType}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase text-gray-500">
                          {t.blockedSubmissionsLanguage || "Language"}
                        </div>
                        <div className="mt-1 text-sm text-gray-900">
                          {LANGUAGE_LABELS[selectedSubmission.language] || selectedSubmission.language}
                        </div>
                      </div>
                    </div>

                    {/* Reason (for user) */}
                    <div>
                      <div className="text-xs font-medium uppercase text-gray-500">
                        {t.blockedSubmissionsReason || "Reason (shown to user)"}
                      </div>
                      <div className="mt-1 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        {selectedSubmission.reason}
                      </div>
                    </div>

                    {/* Analysis (for admin) */}
                    {selectedSubmission.analysis && (
                      <div>
                        <div className="text-xs font-medium uppercase text-gray-500">
                          {t.blockedSubmissionsAnalysis || "AI Analysis (admin only)"}
                        </div>
                        <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                          {selectedSubmission.analysis}
                        </div>
                      </div>
                    )}

                    {/* Source Code */}
                    <div>
                      <div className="text-xs font-medium uppercase text-gray-500">
                        {t.blockedSubmissionsSourceCode || "Source Code"}
                      </div>
                      <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-sm text-gray-100">
                        <code>{selectedSubmission.sourceTrunc}</code>
                      </pre>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">IP:</span> {selectedSubmission.ip || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Latency:</span>{" "}
                        {selectedSubmission.latencyMs ? `${selectedSubmission.latencyMs}ms` : "-"}
                      </div>
                      <div>
                        <span className="font-medium">Input Tokens:</span>{" "}
                        {selectedSubmission.inputTokens || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Output Tokens:</span>{" "}
                        {selectedSubmission.outputTokens || "-"}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t.blockedSubmissionsClose || "Close"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
