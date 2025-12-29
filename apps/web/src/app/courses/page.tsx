'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourses } from "@/hooks/useCourses";
import type { CourseStatus, CourseSummary } from "@/types/course";
import { PendingInvitations } from "./_components/pending-invitations";

// --- Components ---

function CourseCard({ course, locale, messages }: { course: CourseSummary, locale: string, messages: any }) {
  // Generate a deterministic but varied gradient based on the course ID/slug
  // We'll stick to the brand color #003865 but vary the angle/opacity
  const gradientStyle = useMemo(() => {
    // simple hash
    const hash = String(course.id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const angle = hash % 360;
    return {
      background: `linear-gradient(${angle}deg, #003865 0%, #005a8c 100%)`,
    };
  }, [course.id]);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#003865]/20"
    >
      {/* Decorative Header */}
      <div className="relative h-32 w-full overflow-hidden" style={gradientStyle}>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        {/* Term Badge - only show if term is set */}
        {course.term && (
          <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            {course.term}
          </div>
        )}
      </div>

      {/* Floating Icon */}
      <div className="absolute left-6 top-24 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-md transition-transform group-hover:scale-110">
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-gray-50 text-2xl font-bold text-[#003865]">
          {course.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-10">
        <h3 className="line-clamp-1 text-xl font-bold text-gray-900 group-hover:text-[#003865] transition-colors">
          {course.name}
        </h3>
        
        {/* Description - only show if provided */}
        {course.description && (
          <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-500">
            {course.description}
          </p>
        )}

        {/* Divider */}
        <div className="my-4 h-px w-full bg-gray-100" />

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {course.teacher && (
            <div className="flex items-center gap-2" title={`${messages.coursesTeacherLabel}${course.teacher.nickname}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[#003865]" aria-hidden="true">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="font-medium max-w-[100px] truncate" aria-label={`${messages.coursesTeacherLabel}${course.teacher.nickname}`}>
                {course.teacher.nickname}
              </span>
            </div>
          )}

          {course.stats?.memberCount !== undefined && (
             <div
               className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1"
               title={messages.coursesMemberCount.replace("{count}", String(course.stats.memberCount))}
             >
               <svg className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                 <circle cx="9" cy="7" r="4" />
                 <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                 <path d="M16 3.13a4 4 0 0 1 0 7.75" />
               </svg>
               <span className="font-semibold text-gray-700" aria-label={messages.coursesMemberCount.replace("{count}", String(course.stats.memberCount))}>
                 {course.stats.memberCount}
               </span>
             </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="h-32 w-full animate-pulse bg-gray-200" />
      <div className="relative px-6 pb-6 pt-10">
        <div className="absolute -top-8 left-6 h-16 w-16 animate-pulse rounded-2xl bg-gray-100 border-4 border-white" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-50" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-50" />
        <div className="my-4 h-px w-full bg-gray-50" />
        <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-10 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS: Array<{ value: CourseStatus; labelKey: "coursesFilterActive" | "coursesFilterArchived" }> = [
  { value: "ACTIVE", labelKey: "coursesFilterActive" },
  { value: "ARCHIVED", labelKey: "coursesFilterArchived" },
];

export default function CoursesPage() {
  const { messages, locale } = useI18n();
  const { user, accessToken, loading: authLoading } = useAuth();
  
  // State
  const [status, setStatus] = useState<CourseStatus>("ACTIVE");
  const [mine, setMine] = useState(false);
  const [term, setTerm] = useState("");

  // Data Fetching
  const { data, loading, hasFetched, error, refetch } = useCourses({
    status,
    mine: mine && !!user,
    term: term.trim() || undefined,
    accessToken,
    authLoading,
  });

  const showSkeleton = (!hasFetched && !error) || (loading && (!data || data.length === 0));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* Page Header Section */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title and Subtitle */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {messages.coursesTitle}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {messages.coursesSubtitle}
              </p>
            </div>

            {/* Create Button */}
            {user && (
              <Link
                href="/courses/new"
                className="inline-flex items-center gap-2 rounded-full bg-[#003865] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#002a4d]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {messages.coursesCreateButton}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-[#F8FAFC] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs */}
            <div className="flex shrink-0 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setMine(false)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${!mine ? 'bg-[#003865] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {messages.coursesTabAll}
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    alert(messages.coursesLoginRequired);
                    return;
                  }
                  setMine(true);
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${mine ? 'bg-[#003865] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {messages.coursesTabMine}
              </button>
            </div>

            {/* Search and Status Filters */}
            <div className="flex flex-1 items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={messages.coursesFilterTermPlaceholder}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#003865]"
                />
              </div>

              {/* Status Dropdown */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className="shrink-0 rounded-lg border-0 bg-gray-50 py-2 pl-4 pr-10 text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#003865] cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {messages[opt.labelKey]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Pending Invitations - kept as is but styled slightly better if needed inside the component, but here we just place it */}
        <div className="mb-8">
            <PendingInvitations />
        </div>

        {/* Course Grid */}
        <div className="min-h-[400px]">
            {showSkeleton ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full bg-red-50 p-4">
                        <svg className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{messages.coursesError}</h3>
                    <button onClick={() => refetch()} className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-red-200 hover:bg-red-50">
                        {messages.retry}
                    </button>
                </div>
            ) : !data || data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-20 text-center">
                    <div className="rounded-full bg-gray-50 p-6 shadow-sm">
                        <svg className="h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{messages.coursesEmpty}</h3>
                    <p className="mt-2 text-gray-500 max-w-sm">{messages.coursesEmptyHint}</p>
                    <button
                        onClick={() => { setTerm(""); setStatus("ACTIVE"); setMine(false); }}
                        className="mt-6 rounded-md bg-[#003865] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#002a4d]"
                    >
                        {messages.coursesClearFilters}
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.map((course) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            locale={locale}
                            messages={messages}
                        />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
