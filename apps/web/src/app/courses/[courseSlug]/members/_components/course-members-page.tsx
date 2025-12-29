'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listCourseMembers } from "@/lib/api/course-member";
import type { CourseMember } from "@/types/course";
import { useAuth } from "@/providers/AuthProvider";
import { MembersTable } from "./members-table";
import { InviteMembersModal } from "./invite-members-modal";
import { PendingJoinRequests } from "./pending-join-requests";

type Props = {
  courseSlug: string;
};

export function CourseMembersPage({ courseSlug }: Props) {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<CourseMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const data = await listCourseMembers(courseSlug, accessToken);
      setMembers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "載入成員失敗";
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUnauthorized(true);
        setMembers(null);
        setError("只有老師或助教可以查看課程成員。");
      } else {
        setMembers(null);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseSlug]);

  useEffect(() => {
    loadMembers().catch(() => null);
  }, [loadMembers]);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#003865]">課程成員</h1>
            <p className="text-sm text-gray-700">查看並管理課程內的老師、助教與學生。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              邀請成員
            </button>
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              返回課程首頁
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-1/3 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
              <div className="h-24 w-full rounded bg-gray-50" />
            </div>
          </div>
        ) : null}

        {!loading && unauthorized ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <p className="font-medium">無法查看課程成員</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : null}

        {!loading && !unauthorized && error && !members ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">無法載入成員列表</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadMembers().catch(() => null)}
                className="rounded-md bg-white px-3 py-1 text-sm font-medium text-red-900 shadow-sm hover:bg-red-100"
              >
                重新整理
              </button>
            </div>
          </div>
        ) : null}

        {!loading && members ? (
          <>
            <PendingJoinRequests
              courseSlug={courseSlug}
              accessToken={accessToken}
              onRequestProcessed={() => loadMembers().catch(() => null)}
            />
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
              <MembersTable
                courseSlug={courseSlug}
                initialMembers={members}
                accessToken={accessToken}
                currentUserId={user?.id ?? null}
                onMembersChange={setMembers}
                onError={setError}
              />
            </div>
          </>
        ) : null}
      </div>

      <InviteMembersModal
        courseSlug={courseSlug}
        accessToken={accessToken}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          loadMembers().catch(() => null);
        }}
      />
    </div>
  );
}
