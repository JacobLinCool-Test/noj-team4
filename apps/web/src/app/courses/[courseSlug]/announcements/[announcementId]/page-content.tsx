'use client';

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseAnnouncementDetail } from "@/hooks/useCourseAnnouncementDetail";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { DeleteAnnouncementButton } from "./_components/delete-announcement-button";

type Props = {
  courseSlug: string;
  announcementId: number;
};

export function AnnouncementDetailContent({ courseSlug, announcementId }: Props) {
  const { accessToken, user, loading: authLoading } = useAuth();

  const { data: course, unauthorized: courseUnauthorized, notFound: courseNotFound } = useCourseDetail(
    courseSlug,
    accessToken,
  );
  const { data, loading, error, unauthorized, notFound, refetch } = useCourseAnnouncementDetail(
    courseSlug,
    announcementId,
    accessToken,
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading skeleton
  if (authLoading || (loading && !data)) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-4 w-4 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-4 w-20 rounded bg-slate-200 skeleton-shimmer" />
          </div>
          {/* Card skeleton */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="h-8 w-2/3 rounded bg-slate-100 skeleton-shimmer" />
            <div className="mt-4 flex gap-3">
              <div className="h-5 w-24 rounded bg-slate-100 skeleton-shimmer" />
              <div className="h-5 w-32 rounded bg-slate-100 skeleton-shimmer" />
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full rounded bg-slate-100 skeleton-shimmer" />
              <div className="h-4 w-5/6 rounded bg-slate-100 skeleton-shimmer" />
              <div className="h-4 w-4/6 rounded bg-slate-100 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (courseNotFound || notFound) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">找不到公告</h3>
            <p className="mt-2 text-slate-500">該公告可能已被刪除或不存在</p>
            <Link
              href={`/courses/${courseSlug}/announcements`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回公告列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (courseUnauthorized || unauthorized) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-amber-900">需要登入</h3>
            <p className="mt-2 text-amber-700">請先登入並加入課程後，才能查看公告</p>
            <Link
              href={`/login?next=/courses/${courseSlug}/announcements/${announcementId}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              前往登入
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-rose-800 font-medium">無法讀取公告</p>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重試
            </button>
          </div>
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
  const canDelete = data.canDelete ?? fallbackCanEdit;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={`/courses/${course?.slug || courseSlug}`}
            className="text-slate-500 hover:text-[#003865]"
          >
            {course?.name ?? "課程"}
          </Link>
          <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link
            href={`/courses/${course?.slug || courseSlug}/announcements`}
            className="text-slate-500 hover:text-[#003865]"
          >
            公告
          </Link>
          <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium truncate max-w-[200px]">{data.title}</span>
        </nav>

        {/* Announcement Card */}
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {data.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2H3a2 2 0 01-2-2V9a2 2 0 012-2h2V5z" />
                      </svg>
                      置頂
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{data.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003865]/10">
                      <svg className="h-3.5 w-3.5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    {data.author.nickname ?? data.author.username}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(data.createdAt)}
                  </span>
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  {canEdit && (
                    <Link
                      href={`/courses/${course?.slug || courseSlug}/announcements/${announcementId}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      編輯
                    </Link>
                  )}
                  {canDelete && (
                    <DeleteAnnouncementButton
                      courseSlug={course?.slug || courseSlug}
                      announcementId={announcementId}
                      accessToken={accessToken}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 sm:px-8">
            <div className="prose prose-slate max-w-none">
              <pre className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed text-slate-700">
                {data.content}
              </pre>
            </div>
          </div>

          {/* Footer */}
          {data.updatedAt !== data.createdAt && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 sm:px-8">
              <p className="text-xs text-slate-500">
                最後更新：{formatDate(data.updatedAt)}
              </p>
            </div>
          )}
        </article>

        {/* Back Link */}
        <div className="flex justify-center">
          <Link
            href={`/courses/${course?.slug || courseSlug}/announcements`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#003865]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回公告列表
          </Link>
        </div>
      </div>
    </div>
  );
}
