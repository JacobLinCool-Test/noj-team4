'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCourseAnnouncement } from "@/lib/api/announcement";

type Props = {
  courseSlug: string;
  announcementId: number;
  accessToken: string | null;
};

export function DeleteAnnouncementButton({ courseSlug, announcementId, accessToken }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm("確定要刪除這則公告嗎？此操作無法復原。");
    if (!ok) return;

    setError(null);
    setIsDeleting(true);
    try {
      await deleteCourseAnnouncement(courseSlug, announcementId, accessToken);
      router.push(`/courses/${courseSlug}/announcements`);
      router.refresh();
    } catch (err) {
      setError("刪除公告失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDeleting ? "刪除中…" : "刪除公告"}
      </button>
    </div>
  );
}
