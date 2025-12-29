'use client';

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useCourse } from "@/contexts/CourseContext";
import type { CourseRole, CourseStatus } from "@/types/course";

const STATUS_STYLES: Record<CourseStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-emerald-500/20", text: "text-emerald-100" },
  ARCHIVED: { bg: "bg-amber-500/20", text: "text-amber-100" },
  DELETED: { bg: "bg-red-500/20", text: "text-red-100" },
};

const ROLE_STYLES: Record<CourseRole, { bg: string; text: string }> = {
  TEACHER: { bg: "bg-violet-500/20", text: "text-violet-100" },
  TA: { bg: "bg-sky-500/20", text: "text-sky-100" },
  STUDENT: { bg: "bg-teal-500/20", text: "text-teal-100" },
};

export function CourseHero() {
  const { messages } = useI18n();
  const { course, loading, isTeacher, isStaff, myRole } = useCourse();

  const isLoading = loading || !course;

  const teacherNames = useMemo(() => {
    if (!course) return "";
    return course.teachers.map((t) => t.nickname || t.username).join(", ");
  }, [course]);

  const statusLabel = useMemo(() => {
    if (!course) return "";
    const labels: Record<CourseStatus, string> = {
      ACTIVE: messages.coursesFilterActive,
      ARCHIVED: messages.coursesFilterArchived,
      DELETED: "Deleted",
    };
    return labels[course.status] ?? course.status;
  }, [course, messages]);

  const roleLabel = useMemo(() => {
    if (!myRole) return null;
    const labels: Record<CourseRole, string> = {
      TEACHER: messages.courseDetailRoleTeacher,
      TA: messages.courseDetailRoleTA,
      STUDENT: messages.courseDetailRoleStudent,
    };
    return labels[myRole] ?? myRole;
  }, [myRole, messages]);

  const statusStyle = course ? (STATUS_STYLES[course.status] ?? STATUS_STYLES.ACTIVE) : STATUS_STYLES.ACTIVE;
  const roleStyle = myRole ? ROLE_STYLES[myRole] : null;

  return (
    <div className="relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003865] via-[#005a9e] to-[#0a7bc4]" />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.06%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

      {/* Decorative Circles */}
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Shine Effect */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Course Title */}
          {isLoading ? (
            <div className="h-10 w-2/3 rounded-lg bg-white/20 skeleton-shimmer" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {course.name}
            </h1>
          )}

          {/* Term & Teacher */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-white/80">
            {isLoading ? (
              <div className="h-5 w-48 rounded bg-white/10 skeleton-shimmer" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{course.term}</span>
                </div>
                {teacherNames && (
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{teacherNames}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isLoading ? (
              <>
                <div className="h-8 w-24 rounded-full bg-white/10 skeleton-shimmer" />
                <div className="h-8 w-20 rounded-full bg-white/10 skeleton-shimmer" />
              </>
            ) : (
              <>
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`h-2 w-2 rounded-full ${course.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {statusLabel}
                </span>

                {/* Role Badge */}
                {roleStyle && roleLabel && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {roleLabel}
                  </span>
                )}

                {/* Member Count Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {messages.courseDetailMemberCount.replace("{count}", String(course.memberCount))}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons - Only show when loaded and is staff */}
          {!isLoading && isStaff && (
            <div className="mt-6 flex flex-wrap gap-3">
              {isTeacher && (
                <Link
                  href={`/courses/${course.slug}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {messages.courseDetailEditButton}
                </Link>
              )}
              <Link
                href={`/courses/${course.slug}/members`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                管理成員
              </Link>
              <Link
                href={`/courses/${course.slug}/exams`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                考試管理
              </Link>
              <Link
                href={`/courses/${course.slug}/audit`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                操作紀錄
              </Link>
            </div>
          )}

          {/* Description - Only show when loaded */}
          {!isLoading && course.description && (
            <p className="mt-6 max-w-3xl text-white/70">
              {course.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
