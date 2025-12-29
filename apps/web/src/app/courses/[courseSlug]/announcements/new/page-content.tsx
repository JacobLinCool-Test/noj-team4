'use client';

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { NewAnnouncementForm } from "../_components/new-announcement-form";

type Props = {
  courseSlug: string;
};

export function NewAnnouncementPageContent({ courseSlug }: Props) {
  const { accessToken } = useAuth();
  const { data: course, loading, unauthorized, notFound } = useCourseDetail(courseSlug, accessToken);

  const isStaff = course?.myRole === "TEACHER" || course?.myRole === "TA";

  if (notFound) {
    return <div className="px-4 py-10 text-sm text-gray-700">找不到課程。</div>;
  }

  if (unauthorized && !course) {
    return <div className="px-4 py-10 text-sm text-gray-700">加入課程後，並具有教師或助教身分才可新增公告。</div>;
  }

  if (loading && !course) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="h-6 w-1/2 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-40 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return <div className="px-4 py-10 text-sm text-gray-700">只有教師與助教可以新增公告。</div>;
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between text-sm">
          <Link href={`/courses/${course?.slug || courseSlug}`} className="text-[#1e5d8f] hover:underline">
            返回課程首頁
          </Link>
          <Link href={`/courses/${course?.slug || courseSlug}/announcements`} className="text-[#1e5d8f] hover:underline">
            返回公告列表
          </Link>
        </div>
        <NewAnnouncementForm courseSlug={course?.slug || courseSlug} accessToken={accessToken} />
      </div>
    </div>
  );
}
