'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  getSubmissions,
  type Submission,
  type SubmissionStatus,
} from '@/lib/api/submission';

export default function SubmissionsPage() {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getSubmissions(
          {
            mine: true,
            page,
            limit: 20,
          },
          accessToken,
        );

        setSubmissions(data.submissions);
        setPagination(data.pagination);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load submissions',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [accessToken, user, page, authLoading]);

  const getStatusBadge = (status: SubmissionStatus, score?: number | null) => {
    const styles: Record<SubmissionStatus, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      RUNNING: 'bg-blue-100 text-blue-700',
      AC: 'bg-green-100 text-green-700',
      PA: 'bg-amber-100 text-amber-700',
      WA: 'bg-red-100 text-red-700',
      CE: 'bg-yellow-100 text-yellow-700',
      TLE: 'bg-orange-100 text-orange-700',
      MLE: 'bg-orange-100 text-orange-700',
      RE: 'bg-red-100 text-red-700',
      OLE: 'bg-orange-100 text-orange-700',
      SA: 'bg-purple-100 text-purple-700',
      JUDGE_ERROR: 'bg-gray-100 text-gray-700',
    };

    const labels: Record<SubmissionStatus, string> = {
      PENDING: messages.submissionStatusPending,
      RUNNING: messages.submissionStatusRunning,
      AC: messages.submissionStatusAC,
      PA: messages.submissionStatusPA,
      WA: messages.submissionStatusWA,
      CE: messages.submissionStatusCE,
      TLE: messages.submissionStatusTLE,
      MLE: messages.submissionStatusMLE,
      RE: messages.submissionStatusRE,
      OLE: messages.submissionStatusOLE,
      SA: messages.submissionStatusSA,
      JUDGE_ERROR: messages.submissionStatusJudgeError,
    };

    const showScore = score !== null && score !== undefined && (status === 'AC' || status === 'PA');

    return (
      <span
        className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}{showScore && ` (${score})`}
      </span>
    );
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      C: messages.submissionLanguageC,
      CPP: messages.submissionLanguageCPP,
      JAVA: messages.submissionLanguageJava,
      PYTHON: messages.submissionLanguagePython,
    };
    return labels[lang] || lang;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="skeleton-shimmer space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="h-8 w-1/4 rounded bg-gray-200/80" />
            <div className="h-32 w-full rounded bg-gray-200/70" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
            <p className="text-yellow-700">{messages.coursesLoginRequired}</p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
            >
              {messages.login}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
            >
              {messages.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {messages.submissionListTitle}
          </h1>
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">{messages.problemsEmpty}</p>
            <Link
              href="/problems"
              className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
            >
              {messages.problemsTitle}
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {messages.problemsTableId}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {messages.problemsTableTitle}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {messages.problemFormLanguages}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {messages.submissionResult}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {messages.submissionTime}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <Link
                            href={`/problems/${submission.problem?.displayId}`}
                            className="font-mono text-sm font-medium text-[#003865] hover:underline"
                          >
                            {submission.problem?.displayId}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/submissions/${submission.id}`}
                            className="text-sm text-gray-900 hover:text-[#003865] hover:underline"
                          >
                            {submission.problem?.title}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {getLanguageLabel(submission.language)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {getStatusBadge(submission.status, submission.score)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(submission.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {messages.paginationInfo
                    .replace('{page}', String(pagination.page))
                    .replace('{totalPages}', String(pagination.totalPages))
                    .replace('{total}', String(pagination.total))}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/submissions?page=${pagination.page - 1}`}
                    className={`rounded-md border px-4 py-2 text-sm ${
                      pagination.page === 1
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={pagination.page === 1}
                  >
                    {messages.paginationPrev}
                  </Link>
                  <Link
                    href={`/submissions?page=${pagination.page + 1}`}
                    className={`rounded-md border px-4 py-2 text-sm ${
                      pagination.page === pagination.totalPages
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={pagination.page === pagination.totalPages}
                  >
                    {messages.paginationNext}
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
