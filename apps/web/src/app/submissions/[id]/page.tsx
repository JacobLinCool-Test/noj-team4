'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  getSubmission,
  getSubmissionSource,
  type Submission,
  type SubmissionStatus,
  type ProgrammingLanguage,
} from '@/lib/api/submission';
import { PipelineResults } from './_components/pipeline-results';
import { CodeEditor } from '@/components/code-editor';

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const { messages } = useI18n();
  const { accessToken } = useAuth();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [source, setSource] = useState<string>('');
  const [loadingSource, setLoadingSource] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!submissionId) return;

    const fetchSubmission = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getSubmission(submissionId, accessToken);
        setSubmission(data);

        // Start polling if status is PENDING or RUNNING
        if (data.status === 'PENDING' || data.status === 'RUNNING') {
          setPolling(true);
        } else {
          setPolling(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load submission',
        );
        setPolling(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, accessToken]);

  // Fetch submission source code when user expands the section
  useEffect(() => {
    if (!submissionId || !showSource || source) return;

    const fetchSource = async () => {
      setLoadingSource(true);
      try {
        const data = await getSubmissionSource(submissionId, accessToken);
        setSource(data.source);
      } catch (err) {
        console.error('Failed to fetch source code:', err);
        // Don't show error to user, just log it
      } finally {
        setLoadingSource(false);
      }
    };

    fetchSource();
  }, [submissionId, accessToken, showSource, source]);

  // Polling for status updates
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const data = await getSubmission(submissionId, accessToken);
        setSubmission(data);

        // Stop polling if status is final
        if (data.status !== 'PENDING' && data.status !== 'RUNNING') {
          setPolling(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [polling, submissionId, accessToken]);

  const getStatusBadge = (status: SubmissionStatus) => {
    const styles: Record<SubmissionStatus, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
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

    return (
      <span
        className={`inline-block rounded-md px-3 py-1.5 text-sm font-medium ${styles[status]}`}
      >
        {labels[status]}
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

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="skeleton-shimmer space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="h-8 w-1/3 rounded bg-gray-200/80" />
            <div className="h-32 w-full rounded bg-gray-200/70" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error}</p>
            <Link
              href="/submissions"
              className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
            >
              {messages.submissionListTitle}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/submissions"
            className="text-sm text-[#003865] hover:underline"
          >
            &larr; {messages.submissionListTitle}
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {messages.submissionDetailTitle}
                </h1>
                <p className="mt-1 text-sm text-gray-500">ID: {submission.id}</p>
              </div>
              <div className="flex items-center gap-3">
                {submission.score !== null && submission.score !== undefined && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    {messages.submissionScore}: {submission.score}
                  </span>
                )}
                {getStatusBadge(submission.status)}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">{messages.problemsTableTitle}</p>
                <Link
                  href={`/problems/${submission.problem?.displayId}`}
                  className="font-medium text-[#003865] hover:underline"
                >
                  [{submission.problem?.displayId}] {submission.problem?.title}
                </Link>
              </div>
              <div>
                <p className="text-sm text-gray-500">{messages.problemFormLanguages}</p>
                <p className="font-medium text-gray-900">
                  {getLanguageLabel(submission.language)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{messages.submissionTime}</p>
                <p className="font-medium text-gray-900">
                  {formatDate(submission.createdAt)}
                </p>
              </div>
              {submission.judgedAt && (
                <div>
                  <p className="text-sm text-gray-500">Judged At</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(submission.judgedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Source code */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {messages.submissionCode}
              </h2>
              <button
                onClick={() => setShowSource(!showSource)}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showSource ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    隱藏程式碼
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    查看程式碼
                  </>
                )}
              </button>
            </div>

            {showSource && (
              <>
                {loadingSource ? (
                  <div className="skeleton-shimmer h-64 rounded-md bg-gray-200/70" />
                ) : source ? (
                  <CodeEditor
                    value={source}
                    language={submission.language as ProgrammingLanguage}
                    height="400px"
                    readOnly
                  />
                ) : (
                  <p className="text-sm text-gray-500">無法載入程式碼</p>
                )}
              </>
            )}
          </div>

          {/* Compile log (if CE) */}
          {submission.status === 'CE' && submission.compileLog && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-yellow-900">
                Compilation Error
              </h2>
              <pre className="overflow-x-auto rounded-md bg-white p-4 text-sm text-gray-800">
                {submission.compileLog}
              </pre>
            </div>
          )}

          {/* Pipeline Results */}
          <PipelineResults
            submissionId={submission.id}
            stageResults={submission.stageResults}
            artifactsKey={submission.artifactsKey}
          />

          {/* Test cases */}
          {submission.cases && submission.cases.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {messages.submissionCases}
              </h2>
              <div className="space-y-3">
                {submission.cases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700">
                          {testCase.name || `Case ${testCase.caseNo + 1}`}
                        </span>
                        {testCase.isSample && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Sample
                          </span>
                        )}
                        {testCase.points !== null && testCase.points !== undefined && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {testCase.points} pts
                          </span>
                        )}
                      </div>
                      {getStatusBadge(testCase.status)}
                    </div>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      {testCase.timeMs !== null && (
                        <div>
                          <span className="text-gray-500">Time:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {testCase.timeMs}ms
                          </span>
                        </div>
                      )}
                      {testCase.memoryKb !== null && (
                        <div>
                          <span className="text-gray-500">Memory:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {testCase.memoryKb}KB
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Output (if available) */}
                    {(testCase.stdoutTrunc || testCase.stderrTrunc) && (
                      <div className="mt-3 space-y-2">
                        {testCase.stdoutTrunc && (
                          <div>
                            <p className="mb-1 text-xs font-medium text-gray-600">
                              實際輸出 (Output):
                            </p>
                            <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs">
                              {testCase.stdoutTrunc}
                            </pre>
                          </div>
                        )}
                        {testCase.stderrTrunc && (
                          <div>
                            <p className="mb-1 text-xs font-medium text-gray-600">
                              錯誤 (Error):
                            </p>
                            <pre className="overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-900">
                              {testCase.stderrTrunc}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
