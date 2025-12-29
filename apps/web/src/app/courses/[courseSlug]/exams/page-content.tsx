'use client';

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCourseExams } from "@/hooks/useCourseExams";
import { ExamStatusBadge } from "./_components/exam-status-badge";

type Props = {
  courseSlug: string;
};

export function ExamsPageContent({ courseSlug }: Props) {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();

  const {
    data: course,
    loading: courseLoading,
    error: courseError,
    unauthorized: courseUnauthorized,
    notFound: courseNotFound,
  } = useCourseDetail(courseSlug, accessToken);

  const {
    data,
    loading,
    error,
    unauthorized,
    notFound,
    refetch,
  } = useCourseExams(courseSlug, accessToken);

  const isMember = course?.myRole !== null;
  const canManage = course?.myRole === "TEACHER" || course?.myRole === "TA";
  const pageTitle = useMemo(
    () => (course ? `${course.name} - 考試` : "考試"),
    [course],
  );

  if (courseNotFound || notFound) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        {messages.courseDetailNotFound}
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-16 rounded-lg border border-gray-200 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (courseUnauthorized && !user) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        <p>{messages.courseDetailNotLoggedIn}</p>
        <Link
          href={`/login?next=/courses/${courseSlug}/exams`}
          className="mt-3 inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-white hover:bg-[#1e5d8f]"
        >
          {messages.login}
        </Link>
      </div>
    );
  }

  if (course && !isMember) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        請先加入課程才能查看考試
      </div>
    );
  }

  // Only show exams page to Teacher/TA
  if (course && !canManage) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        只有教師和助教可以管理考試
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600">
              <Link href={`/courses/${course?.slug || courseSlug}`} className="text-[#1e5d8f] hover:underline">
                &larr; 返回課程
              </Link>
            </p>
            <h1 className="text-2xl font-semibold text-[#003865]">{pageTitle}</h1>
            {course ? (
              <p className="text-sm text-gray-700">
                {course.term} - {messages.courseDetailMemberCount.replace("{count}", String(course.memberCount))}
              </p>
            ) : null}
          </div>
          {canManage ? (
            <Link
              href={`/courses/${course?.slug || courseSlug}/exams/new`}
              className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f]"
            >
              建立考試
            </Link>
          ) : null}
        </div>

        {!authLoading && ((unauthorized && !user) || (courseUnauthorized && !user)) ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {messages.courseDetailNotLoggedIn}
          </div>
        ) : null}

        {(loading || courseLoading) && (!data || data.length === 0) ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-16 rounded-lg border border-gray-200 bg-gray-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>無法載入考試列表</p>
            <p className="mt-1 font-mono text-xs text-red-600">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-2 rounded-md bg-[#003865] px-3 py-1 text-white hover:bg-[#1e5d8f]"
            >
              {messages.retry}
            </button>
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((exam) => (
              <Link
                key={exam.id}
                href={`/courses/${course?.slug || courseSlug}/exams/${exam.id}`}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1e5d8f] hover:shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#003865]">{exam.title}</h3>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  <span>
                    開始: {new Date(exam.startsAt).toLocaleString()}
                  </span>
                  <span>
                    結束: {new Date(exam.endsAt).toLocaleString()}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {exam.problemCount} 題
                  </span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {exam.usedCodeCount}/{exam.codeCount} 已登入
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  建立者: {exam.createdBy.nickname ?? exam.createdBy.username}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
            目前沒有考試
          </div>
        )}
      </div>
      {courseError && !error ? (
        <p className="mt-4 text-xs text-red-600">{courseError}</p>
      ) : null}
    </div>
  );
}
