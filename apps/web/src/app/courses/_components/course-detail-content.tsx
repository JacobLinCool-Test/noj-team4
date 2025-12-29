'use client';

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import type { CourseRole, CourseStatus } from "@/types/course";
import { CourseJoinSection } from "../[courseSlug]/_components/course-join-section";
import { CourseLeaveButton } from "../[courseSlug]/_components/course-leave-button";
import { AnnouncementsPreview } from "./announcements-preview";
import { HomeworksPreview } from "./homeworks-preview";
import { CourseProblemsSection } from "../[courseSlug]/_components/course-problems-section";

type Props = {
  courseSlug: string;
};

const ROLE_LABELS: Record<CourseRole, (messages: ReturnType<typeof useI18n>["messages"]) => string> = {
  TEACHER: (m) => m.courseDetailRoleTeacher,
  TA: (m) => m.courseDetailRoleTA,
  STUDENT: (m) => m.courseDetailRoleStudent,
};

const STATUS_LABELS: Partial<Record<CourseStatus, (messages: ReturnType<typeof useI18n>["messages"]) => string>> = {
  ACTIVE: (m) => m.coursesFilterActive,
  ARCHIVED: (m) => m.coursesFilterArchived,
};

export function CourseDetailContent({ courseSlug }: Props) {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const { data, loading, error, unauthorized, notFound, refetch, setData: setCourseDetail } = useCourseDetail(
    courseSlug,
    accessToken,
  );
  const isLoggedIn = Boolean(user) && !unauthorized;

  const teacherNames = useMemo(() => {
    if (!data) return "";
    return data.teachers.map((t) => t.nickname || t.username).join(", ");
  }, [data]);

  const myRoleLabel = useMemo(() => {
    if (!data?.myRole) return null;
    return ROLE_LABELS[data.myRole]?.(messages) ?? data.myRole;
  }, [data?.myRole, messages]);

  const statusLabel = useMemo(() => {
    if (!data) return "";
    return STATUS_LABELS[data.status]?.(messages) ?? data.status;
  }, [data, messages]);

  const renderStateCard = (content: ReactNode) => (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">{content}</div>
  );

  if (notFound) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {renderStateCard(<p className="text-gray-700">{messages.courseDetailNotFound}</p>)}
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {renderStateCard(
            <div className="space-y-3">
              <div className="h-6 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-24 w-full rounded bg-gray-100" />
            </div>,
          )}
        </div>
      </div>
    );
  }

  if (unauthorized && !authLoading && !isLoggedIn && !data) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {renderStateCard(
            <div className="space-y-3 text-gray-800">
              <p>{messages.courseDetailNotLoggedIn}</p>
              <Link
                href={`/login?next=/courses/${courseSlug}`}
                className="inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
              >
                {messages.courseDetailLoginCta}
              </Link>
            </div>,
          )}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {renderStateCard(
            <div className="space-y-3 text-gray-800">
              <p>{messages.courseDetailError}</p>
              <p className="font-mono text-xs text-red-600">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="rounded-md bg-[#003865] px-3 py-1 text-sm font-medium text-white hover:bg-[#1e5d8f]"
              >
                {messages.retry}
              </button>
            </div>,
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isMember = data.myRole !== null;
  const isTeacher = data.myRole === "TEACHER";
  const isStaff = data.myRole === "TEACHER" || data.myRole === "TA";

  const descriptionText = data.description?.trim() ?? "";
  const hasDescription = descriptionText.length > 0;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-[#003865]">{data.name}</h1>
              <p className="text-sm text-gray-700">{data.term}</p>
              <div className="flex flex-wrap gap-2 text-sm text-gray-800">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                  {messages.courseDetailStatusLabel}
                  {statusLabel ? `：${statusLabel}` : ""}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                  {messages.courseDetailMemberCount.replace("{count}", String(data.memberCount))}
                </span>
                {teacherNames ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {messages.courseDetailTeachers}
                    {teacherNames}
                  </span>
                ) : null}
                {myRoleLabel ? (
                  <span className="rounded-full bg-[#003865]/10 px-3 py-1 text-xs font-medium text-[#003865]">
                    {messages.courseDetailMyRole}
                    {myRoleLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {isTeacher && (
                <Link
                  href={`/courses/${data.slug}/edit`}
                  className="rounded-md border border-[#003865] bg-white px-4 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865] hover:text-white"
                >
                  {messages.courseDetailEditButton}
                </Link>
              )}
              {isStaff && (
                <Link
                  href={`/courses/${data.slug}/members`}
                  className="rounded-md border border-[#003865] bg-white px-4 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865] hover:text-white"
                >
                  管理成員
                </Link>
              )}
              {isStaff && (
                <Link
                  href={`/courses/${data.slug}/exams`}
                  className="rounded-md border border-[#003865] bg-white px-4 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865] hover:text-white"
                >
                  考試管理
                </Link>
              )}
              {isStaff && (
                <Link
                  href={`/courses/${data.slug}/audit`}
                  className="rounded-md border border-[#003865] bg-white px-4 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865] hover:text-white"
                >
                  學生操作紀錄
                </Link>
              )}
              <CourseLeaveButton
                courseSlug={data.slug}
                myRole={data.myRole}
                accessToken={accessToken}
                onLeft={(detail) => setCourseDetail(detail)}
              />
            </div>
          </div>
          {hasDescription ? (
            <p className="mt-4 whitespace-pre-wrap text-gray-800">{descriptionText}</p>
          ) : null}
        </section>

        <CourseJoinSection
          courseSlug={data.slug}
          enrollmentType={data.enrollmentType}
          myRole={data.myRole}
          isLoggedIn={isLoggedIn}
          accessToken={accessToken}
          onJoined={refetch}
        />

        {isMember ? (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#003865]">{messages.courseDetailSummary}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-600">{messages.courseDetailSubmissionCount}</p>
                  <p className="text-2xl font-semibold text-[#003865]">{data.submissionCount}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-600">{messages.courseDetailHomeworkCount}</p>
                  <p className="text-2xl font-semibold text-[#003865]">{data.homeworkCount}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#003865]">{messages.courseDetailAnnouncementsTitle}</h3>
                <Link
                  href={`/courses/${data.slug}/announcements`}
                  className="text-sm font-medium text-[#1e5d8f] hover:underline"
                >
                  {messages.courseDetailViewAll}
                </Link>
              </div>
              <div className="mt-3">
                <AnnouncementsPreview courseSlug={data.slug} isMember={isMember} />
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#003865]">{messages.courseDetailHomeworksTitle}</h3>
                <Link
                  href={`/courses/${data.slug}/homeworks`}
                  className="text-sm font-medium text-[#1e5d8f] hover:underline"
                >
                  {messages.courseDetailViewAll}
                </Link>
              </div>
              <div className="mt-3">
                <HomeworksPreview courseSlug={data.slug} isMember={isMember} />
              </div>
            </section>

            <CourseProblemsSection
              courseSlug={data.slug}
              isStaff={isStaff}
              showViewAll
            />
          </>
        ) : isLoggedIn ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-amber-800">{messages.courseDetailNotEnrolledTitle}</h3>
            <p className="mt-2 text-sm text-amber-900">{messages.courseDetailNotEnrolled}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
