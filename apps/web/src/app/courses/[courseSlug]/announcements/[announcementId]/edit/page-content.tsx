'use client';

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCourseAnnouncementDetail } from "@/hooks/useCourseAnnouncementDetail";
import { EditAnnouncementForm } from "./_components/edit-announcement-form";

type Props = {
  courseSlug: string;
  announcementId: number;
};

export function EditAnnouncementPageContent({ courseSlug, announcementId }: Props) {
  const { accessToken, user, loading: authLoading } = useAuth();

  const { data: course, unauthorized: courseUnauthorized, notFound: courseNotFound, loading: courseLoading } =
    useCourseDetail(courseSlug, accessToken);
  const { data, loading, error, unauthorized, notFound, refetch } = useCourseAnnouncementDetail(
    courseSlug,
    announcementId,
    accessToken,
  );

  if (authLoading || ((courseLoading || loading) && !data)) {
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

  if (courseNotFound || notFound) {
    return <div className="px-4 py-10 text-sm text-gray-700">找不到課程或公告。</div>;
  }

  if (courseUnauthorized || unauthorized) {
    return <div className="px-4 py-10 text-sm text-gray-700">請先登入並加入課程後，才能編輯公告。</div>;
  }

  if (error && !data) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>無法讀取公告：{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 rounded-md bg-[#003865] px-3 py-1 text-white hover:bg-[#1e5d8f]"
          >
            重新整理
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isTeacher = course?.myRole === "TEACHER";
  const isTa = course?.myRole === "TA";
  const isAuthor = data.author.id === user?.id;
  const fallbackCanEdit = Boolean(isTeacher || (isTa && isAuthor));
  const canEdit = data.canEdit ?? fallbackCanEdit;

  if (!canEdit) {
    return <div className="px-4 py-10 text-sm text-gray-700">你沒有權限編輯這則公告。</div>;
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between text-sm">
          <Link href={`/courses/${course?.slug || courseSlug}`} className="text-[#1e5d8f] hover:underline">
            返回課程首頁
          </Link>
          <div className="space-x-3">
            <Link href={`/courses/${course?.slug || courseSlug}/announcements`} className="text-[#1e5d8f] hover:underline">
              返回公告列表
            </Link>
            <Link
              href={`/courses/${course?.slug || courseSlug}/announcements/${announcementId}`}
              className="text-[#1e5d8f] hover:underline"
            >
              返回公告詳情
            </Link>
          </div>
        </div>
        <EditAnnouncementForm courseSlug={course?.slug || courseSlug} announcement={data} accessToken={accessToken} />
      </div>
    </div>
  );
}
