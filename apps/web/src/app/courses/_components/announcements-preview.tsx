'use client';

import Link from "next/link";
import { useCourseAnnouncements } from "@/hooks/useCourseAnnouncements";
import { useAuth } from "@/providers/AuthProvider";
import type { Announcement } from "@/types/announcement";

type Props = {
  courseSlug: string;
  isMember: boolean;
};

export function AnnouncementsPreview({ courseSlug, isMember }: Props) {
  const { accessToken, loading: authLoading } = useAuth();
  const { data, loading, unauthorized, error } = useCourseAnnouncements(courseSlug, accessToken, { enabled: isMember });

  const topThree: Announcement[] = (data ?? []).slice(0, 3);

  if (!isMember) {
    return <p className="text-sm text-gray-700">加入課程後，才能查看公告。</p>;
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-10 rounded-md bg-gray-100" />
        ))}
      </div>
    );
  }

  if (unauthorized) {
    return <p className="text-sm text-gray-700">請先登入並加入課程後，再查看公告。</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">無法取得公告：{error}</p>;
  }

  if (!topThree.length) {
    return <p className="text-sm text-gray-700">目前沒有公告。</p>;
  }

  return (
    <ul className="space-y-2">
      {topThree.map((a) => (
        <li key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <Link
            href={`/courses/${courseSlug}/announcements/${a.id}`}
            className="text-sm font-semibold text-[#003865] hover:text-[#1e5d8f]"
          >
            {a.isPinned ? "📌 " : ""}
            {a.title}
          </Link>
          <div className="text-xs text-gray-700">
            {a.author.nickname ?? a.author.username} · {new Date(a.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
