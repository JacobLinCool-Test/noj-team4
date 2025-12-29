'use client';

import Link from "next/link";
import { type ReactNode, useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { CourseProvider, useCourse } from "@/contexts/CourseContext";
import { CourseHero } from "./_components/course-hero";
import { CourseTabs } from "./_components/course-tabs";
import { CourseJoinSection } from "./_components/course-join-section";

// Loading skeleton component to avoid duplication
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003865] via-[#005a9e] to-[#0a7bc4]" />
        <div className="relative px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="h-10 w-2/3 rounded-lg bg-white/20 skeleton-shimmer" />
            <div className="mt-3 h-5 w-48 rounded bg-white/10 skeleton-shimmer" />
            <div className="mt-5 flex gap-3">
              <div className="h-8 w-24 rounded-full bg-white/10 skeleton-shimmer" />
              <div className="h-8 w-20 rounded-full bg-white/10 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
      {/* Tabs Skeleton */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-16 rounded bg-slate-200 skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Inner layout component that uses CourseContext
function CourseLayoutInner({ children }: { children: ReactNode }) {
  const { messages } = useI18n();
  const pathname = usePathname();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { course, loading, error, unauthorized, notFound, isMember, refetch } = useCourse();

  // Track if component has mounted to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we're on a problem detail page - these should be rendered standalone
  const isProblemDetailPage = /\/courses\/[^/]+\/problems\/[^/]+$/.test(pathname) &&
    !pathname.endsWith('/new') &&
    !pathname.endsWith('/edit') &&
    !pathname.endsWith('/copycat');

  const isLoggedIn = Boolean(user);

  // For problem detail pages, let the page handle its own loading state
  if (isProblemDetailPage) {
    return <>{children}</>;
  }

  // Show skeleton until mounted AND data is loaded to prevent hydration mismatch
  const isLoading = !mounted || authLoading || loading;

  // Loading state - show pure skeleton without CourseHero to avoid flicker
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{messages.courseDetailNotFound}</h3>
          <p className="text-slate-500 mb-6">找不到此課程，請確認連結是否正確。</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-lg bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#002a4d]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回課程列表
          </Link>
        </div>
      </div>
    );
  }

  // Unauthorized - needs login
  if (unauthorized && !isLoggedIn && !course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#003865]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{messages.courseDetailNotLoggedIn}</h3>
          <p className="text-slate-500 mb-6">請先登入以查看課程內容。</p>
          <Link
            href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#002a4d]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {messages.courseDetailLoginCta}
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{messages.courseDetailError}</h3>
          <p className="text-sm text-slate-500 font-mono bg-slate-50 rounded-lg p-3 mt-4 mb-6">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#002a4d]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {messages.retry}
          </button>
        </div>
      </div>
    );
  }

  // If course is not loaded yet, keep showing skeleton
  if (!course) {
    return <LoadingSkeleton />;
  }

  // If course data exists but user is not a member, show join section
  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <CourseHero />
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <CourseJoinSection
            courseSlug={course.slug}
            enrollmentType={course.enrollmentType}
            myRole={null}
            isLoggedIn={isLoggedIn}
            accessToken={accessToken}
            onJoined={refetch}
          />

          {/* Preview message */}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-amber-800">{messages.courseDetailNotEnrolledTitle}</h3>
            <p className="mt-2 text-amber-700">{messages.courseDetailNotEnrolled}</p>
          </div>
        </div>
      </div>
    );
  }

  // Course exists and user is a member - show full layout
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <CourseHero />
      <CourseTabs />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

// Wrapper to apply transition effect
function TransitionWrapper({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.1s ease-out',
      }}
    >
      {children}
    </div>
  );
}

// Main layout component that wraps with CourseProvider
export default function CourseLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = params.courseSlug;

  // Show skeleton instead of null to prevent flash
  if (!courseSlug) {
    return <LoadingSkeleton />;
  }

  return (
    <TransitionWrapper>
      <CourseProvider courseSlug={courseSlug}>
        <CourseLayoutInner>{children}</CourseLayoutInner>
      </CourseProvider>
    </TransitionWrapper>
  );
}
