'use client';

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCourseExamDetail } from "@/hooks/useCourseExamDetail";
import { ExamForm } from "../../_components/exam-form";

type Props = {
  courseSlug: string;
  examId: string;
};

export function EditExamPageContent({ courseSlug, examId }: Props) {
  const { accessToken, user, loading: authLoading } = useAuth();

  const {
    data: course,
    loading: courseLoading,
    unauthorized: courseUnauthorized,
    notFound: courseNotFound,
  } = useCourseDetail(courseSlug, accessToken);

  const {
    data: exam,
    loading: examLoading,
    notFound: examNotFound,
  } = useCourseExamDetail(courseSlug, examId, accessToken);

  const canManage = course?.myRole === "TEACHER" || course?.myRole === "TA";

  if (courseNotFound || examNotFound) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        找不到考試
      </div>
    );
  }

  if (authLoading || courseLoading || examLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </div>
    );
  }

  if (courseUnauthorized && !user) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        <p>請先登入</p>
        <Link
          href={`/login?next=/courses/${courseSlug}/exams/${examId}/edit`}
          className="mt-3 inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-white hover:bg-[#1e5d8f]"
        >
          登入
        </Link>
      </div>
    );
  }

  if (!canManage || !exam?.canEdit) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        您沒有編輯此考試的權限
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            <Link href={`/courses/${courseSlug}/exams/${examId}`} className="text-[#1e5d8f] hover:underline">
              &larr; 返回考試詳情
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-[#003865]">編輯考試</h1>
          {course ? (
            <p className="text-sm text-gray-700">{course.name}</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <ExamForm
            courseSlug={courseSlug}
            mode="edit"
            examId={examId}
            initialData={exam}
          />
        </div>
      </div>
    </div>
  );
}
