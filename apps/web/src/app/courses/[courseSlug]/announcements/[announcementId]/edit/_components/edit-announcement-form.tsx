'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCourseAnnouncement } from "@/lib/api/announcement";
import type { Announcement } from "@/types/announcement";

type Props = {
  courseSlug: string;
  announcement: Announcement;
  accessToken: string | null;
};

export function EditAnnouncementForm({ courseSlug, announcement, accessToken }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [isPinned, setIsPinned] = useState(announcement.isPinned);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateCourseAnnouncement(
        courseSlug,
        announcement.id,
        { title, content, isPinned },
        accessToken,
      );
      router.push(`/courses/${courseSlug}/announcements/${announcement.id}`);
      router.refresh();
    } catch (err) {
      setError("更新公告失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-[#003865]">編輯公告</h1>
      {error ? <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-800" htmlFor="title">
          標題
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          placeholder="請輸入公告標題"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-800" htmlFor="content">
          內容
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={20000}
          rows={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          placeholder="支援 Markdown 內容"
        />
        <p className="text-xs text-gray-500">上限 20,000 字元。</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
        />
        置頂
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "儲存中…" : "儲存變更"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:border-[#1e5d8f]"
        >
          取消
        </button>
      </div>
    </form>
  );
}
