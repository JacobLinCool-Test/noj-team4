'use client';

import { useState } from 'react';
import {
  createCourseInvitations,
  type CreateInvitationsResult,
  ApiError,
} from '@/lib/api/course-invitation';

type Props = {
  courseSlug: string;
  accessToken?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function InviteMembersModal({
  courseSlug,
  accessToken,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateInvitationsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await createCourseInvitations(courseSlug, emails, accessToken);
      setResult(data);

      if (data.invited.length > 0) {
        onSuccess?.();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('發送邀請時發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmails('');
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-[#003865]">邀請成員</h2>
        <p className="mt-1 text-sm text-gray-600">
          輸入要邀請的 Email，每行一個。被邀請者需要在課程列表頁面接受邀請才會加入課程。
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="emails" className="block text-sm font-medium text-gray-700">
              Email 列表
            </label>
            <textarea
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"student1@example.com\nstudent2@example.com\nstudent3@example.com"}
              rows={8}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="space-y-2 text-sm">
              {result.invited.length > 0 && (
                <div className="rounded-md bg-green-50 p-3 text-green-700">
                  成功邀請 {result.invited.length} 人
                </div>
              )}
              {result.alreadyMember.length > 0 && (
                <div className="rounded-md bg-yellow-50 p-3 text-yellow-700">
                  {result.alreadyMember.length} 人已是課程成員
                </div>
              )}
              {result.alreadyInvited.length > 0 && (
                <div className="rounded-md bg-blue-50 p-3 text-blue-700">
                  {result.alreadyInvited.length} 人已有待處理的邀請
                </div>
              )}
              {result.invalidEmail.length > 0 && (
                <div className="rounded-md bg-gray-50 p-3 text-gray-700">
                  {result.invalidEmail.length} 個無效的 Email
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              關閉
            </button>
            <button
              type="submit"
              disabled={loading || !emails.trim()}
              className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
            >
              {loading ? '發送中...' : '發送邀請'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
