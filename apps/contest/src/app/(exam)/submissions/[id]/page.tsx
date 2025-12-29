'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSubmission, type SubmissionDetail } from '@/lib/api';
import { CodeEditor } from '@/components/CodeEditor';

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const data = await getSubmission(submissionId);
        setSubmission(data.submission);
      } catch (err) {
        setError((err as Error).message || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    }

    fetchSubmission();

    // Poll for updates if pending/judging
    const interval = setInterval(async () => {
      try {
        const data = await getSubmission(submissionId);
        setSubmission(data.submission);
        if (!['PENDING', 'JUDGING'].includes(data.submission.status)) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [submissionId]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      AC: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
      WA: { bg: 'bg-red-100', text: 'text-red-800', label: 'Wrong Answer' },
      TLE: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Time Limit Exceeded' },
      MLE: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Memory Limit Exceeded' },
      RE: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Runtime Error' },
      CE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Compile Error' },
      PENDING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending...' },
      JUDGING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Judging...' },
    };

    const statusInfo = statusMap[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const getTestStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      AC: { bg: 'bg-green-500', text: 'text-white' },
      WA: { bg: 'bg-red-500', text: 'text-white' },
      TLE: { bg: 'bg-yellow-500', text: 'text-white' },
      MLE: { bg: 'bg-purple-500', text: 'text-white' },
      RE: { bg: 'bg-orange-500', text: 'text-white' },
    };

    const statusInfo = statusMap[status] || {
      bg: 'bg-gray-500',
      text: 'text-white',
    };

    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-96 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        {error || '提交不存在'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/problems/${submission.problemId}`}
            className="text-2xl font-bold text-blue-600 hover:text-blue-800"
          >
            {submission.problemTitle}
          </Link>
          <div className="flex items-center gap-4 mt-2">
            {getStatusBadge(submission.status)}
            <span className="text-gray-500">{submission.language}</span>
            <span className="font-semibold">分數: {submission.score}</span>
          </div>
        </div>
        <Link
          href="/submissions"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          返回提交紀錄
        </Link>
      </div>

      {/* Test Results */}
      {submission.testResults && submission.testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">測試結果</h3>
          <div className="flex flex-wrap gap-2">
            {submission.testResults.map((result) => (
              <div
                key={result.testcase}
                className="flex flex-col items-center"
                title={`Time: ${result.time}ms, Memory: ${result.memory}KB`}
              >
                {getTestStatusBadge(result.status)}
                <span className="text-xs text-gray-500 mt-1">
                  #{result.testcase}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">程式碼</h3>
        <CodeEditor
          value={submission.code}
          onChange={() => {}}
          language={submission.language}
          height="400px"
          readOnly
        />
      </div>
    </div>
  );
}
