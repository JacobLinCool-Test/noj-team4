'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listCourseJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  type CourseJoinRequest,
} from '@/lib/api/course-join-request';

type Props = {
  courseSlug: string;
  accessToken: string | null;
  onRequestProcessed?: () => void;
};

export function PendingJoinRequests({ courseSlug, accessToken, onRequestProcessed }: Props) {
  const [requests, setRequests] = useState<CourseJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listCourseJoinRequests(courseSlug, accessToken);
      // Only show pending requests
      setRequests(data.filter((r) => r.status === 'PENDING'));
    } catch (err) {
      console.error('Failed to fetch join requests', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseSlug]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    setError(null);
    try {
      await approveJoinRequest(courseSlug, requestId, accessToken);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      onRequestProcessed?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : '批准失敗';
      setError(message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!window.confirm('確定要拒絕此申請嗎？')) return;
    setProcessing(requestId);
    setError(null);
    try {
      await rejectJoinRequest(courseSlug, requestId, accessToken);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      const message = err instanceof Error ? err.message : '拒絕失敗';
      setError(message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-900">待審核的加入申請</h2>
      <p className="mt-1 text-sm text-amber-800">
        共 {requests.length} 位學生申請加入此課程
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-3 rounded-md bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">
                {request.user.nickname || request.user.username}
              </p>
              <p className="text-sm text-gray-600">
                @{request.user.username}
              </p>
              <p className="text-xs text-gray-500">
                申請時間：{new Date(request.createdAt).toLocaleString('zh-TW')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApprove(request.id)}
                disabled={processing === request.id}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {processing === request.id ? '處理中...' : '批准'}
              </button>
              <button
                type="button"
                onClick={() => handleReject(request.id)}
                disabled={processing === request.id}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                拒絕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
