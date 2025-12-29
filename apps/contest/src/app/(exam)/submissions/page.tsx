'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSubmissions, type Submission } from '@/lib/api';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const data = await getSubmissions();
        setSubmissions(data.submissions);
      } catch (err) {
        setError((err as Error).message || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      AC: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
      WA: { bg: 'bg-red-100', text: 'text-red-800', label: 'Wrong Answer' },
      TLE: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Time Limit' },
      MLE: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Memory Limit' },
      RE: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Runtime Error' },
      CE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Compile Error' },
      PENDING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
      JUDGING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Judging' },
    };

    const statusInfo = statusMap[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">提交紀錄</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {[...Array(5)].map((_, i) => (
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">提交紀錄</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                題目
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                語言
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                分數
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(submission.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/problems/${submission.problemId}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {submission.problemTitle}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submission.language}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/submissions/${submission.id}`}>
                    {getStatusBadge(submission.status)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {submission.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {submissions.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            尚無提交紀錄
          </div>
        )}
      </div>
    </div>
  );
}
