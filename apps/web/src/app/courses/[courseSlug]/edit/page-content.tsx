'use client';

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { CourseForm } from "../../_components/course-form";
import { DeleteCourseSection } from "./_components/delete-course-section";

type Props = {
  courseSlug: string;
};

export function EditCoursePageContent({ courseSlug }: Props) {
  const { messages } = useI18n();
  const { accessToken, user } = useAuth();
  const { data, loading, error, unauthorized, notFound } = useCourseDetail(courseSlug, accessToken);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="h-6 w-1/2 rounded bg-gray-200" />
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-24 w-full rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || unauthorized) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">{messages.courseEditLoginRequired}</p>
          <Link
            href={`/login?next=/courses/${courseSlug}/edit`}
            className="mt-3 inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            {messages.courseDetailLoginCta}
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">{messages.courseDetailNotFound}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">{messages.courseDetailError}</p>
          <p className="mt-2 font-mono text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Check if user is a teacher
  const isTeacher = data.myRole === "TEACHER";
  if (!isTeacher) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">{messages.courseEditPermissionDenied}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-3">
          <Link
            href={`/courses/${data.slug}`}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#003865]"
          >
            <span>←</span>
            <span>{messages.courseEditBackButton}</span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#003865]">{messages.courseEditTitle}</h1>
            <p className="text-sm text-gray-700">{messages.courseEditSubtitle}</p>
          </div>
        </div>
        <CourseForm mode="edit" courseSlug={data.slug ?? courseSlug} initialData={data} accessToken={accessToken} />
        <DeleteCourseSection courseSlug={data.slug ?? courseSlug} courseName={data.name} accessToken={accessToken} />
      </div>
    </div>
  );
}
