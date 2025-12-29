'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import {
  listMyInvitations,
  acceptInvitation,
  rejectInvitation,
  type CourseInvitation,
} from '@/lib/api/course-invitation';

export function PendingInvitations() {
  const router = useRouter();
  const { accessToken, user, loading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<CourseInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await listMyInvitations(accessToken);
      setInvitations(data);
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // Wait for auth bootstrap to complete before fetching
    if (authLoading) return;
    fetchInvitations();
  }, [fetchInvitations, authLoading]);

  const handleAccept = async (id: string) => {
    setProcessing(id);
    try {
      const result = await acceptInvitation(id, accessToken);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      router.push(`/courses/${result.courseSlug}`);
    } catch (err) {
      console.error('Failed to accept invitation', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('確定要拒絕此邀請嗎？')) return;

    setProcessing(id);
    try {
      await rejectInvitation(id, accessToken);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      console.error('Failed to reject invitation', err);
    } finally {
      setProcessing(null);
    }
  };

  if (!user || loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h2 className="text-lg font-semibold text-blue-900">待處理的課程邀請</h2>
      <div className="mt-3 space-y-3">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-col gap-3 rounded-md bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">
                {inv.course.name}
                <span className="ml-2 text-sm text-gray-500">({inv.course.term})</span>
              </p>
              <p className="text-sm text-gray-600">
                邀請者：{inv.invitedBy.nickname || inv.invitedBy.username}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAccept(inv.id)}
                disabled={processing === inv.id}
                className="rounded-md bg-[#003865] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
              >
                {processing === inv.id ? '處理中...' : '接受'}
              </button>
              <button
                type="button"
                onClick={() => handleReject(inv.id)}
                disabled={processing === inv.id}
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
