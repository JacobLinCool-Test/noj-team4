'use client';

import Link from "next/link";
import { useCourseHomeworks } from "@/hooks/useCourseHomeworks";
import { useAuth } from "@/providers/AuthProvider";
import type { HomeworkListItem, HomeworkStatus } from "@/types/homework";

type Props = {
  courseSlug: string;
  isMember: boolean;
};

const STATUS_LABELS: Record<HomeworkStatus, string> = {
  UPCOMING: "即將開始",
  ONGOING: "進行中",
  ENDED: "已結束",
};

const STATUS_COLORS: Record<HomeworkStatus, string> = {
  UPCOMING: "bg-blue-100 text-blue-800",
  ONGOING: "bg-green-100 text-green-800",
  ENDED: "bg-gray-100 text-gray-800",
};

export function HomeworksPreview({ courseSlug, isMember }: Props) {
  const { accessToken, loading: authLoading } = useAuth();
  const { data, loading, unauthorized, error } = useCourseHomeworks(isMember ? courseSlug : null, accessToken);

  const topThree: HomeworkListItem[] = (data ?? []).slice(0, 3);

  if (!isMember) {
    return <p className="text-sm text-gray-700">加入課程後，才能查看作業。</p>;
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-16 rounded-md bg-gray-100" />
        ))}
      </div>
    );
  }

  if (unauthorized) {
    return <p className="text-sm text-gray-700">請先登入並加入課程後，再查看作業。</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">無法取得作業：{error}</p>;
  }

  if (!topThree.length) {
    return <p className="text-sm text-gray-700">目前沒有作業。</p>;
  }

  return (
    <ul className="space-y-2">
      {topThree.map((hw) => (
        <li key={hw.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/courses/${courseSlug}/homeworks/${hw.id}`}
              className="flex-1 text-sm font-semibold text-[#003865] hover:text-[#1e5d8f]"
            >
              {hw.title}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[hw.status]}`}>
              {STATUS_LABELS[hw.status]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-700">
            <span>{hw.problemCount} 題</span>
            <span>
              {new Date(hw.startAt).toLocaleDateString()} - {new Date(hw.endAt).toLocaleDateString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
