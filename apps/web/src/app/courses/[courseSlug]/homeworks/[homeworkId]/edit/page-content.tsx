'use client';

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useHomeworkDetail } from "@/hooks/useHomeworkDetail";
import { HomeworkForm } from "../../_components/homework-form";

type Props = {
  courseSlug: string;
  homeworkId: string;
};

export function HomeworkEditContent({ courseSlug, homeworkId }: Props) {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const { data, loading, error, unauthorized, notFound } = useHomeworkDetail(
    courseSlug,
    homeworkId,
    accessToken,
  );

  if (authLoading || (loading && !data)) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="h-10 rounded-lg border border-gray-200 bg-gray-100" />
          <div className="h-6 rounded-lg border border-gray-200 bg-gray-100" />
          <div className="h-24 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        {messages.courseDetailNotFound}
      </div>
    );
  }

  if (unauthorized && !user) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        <p>{messages.courseDetailNotLoggedIn}</p>
        <Link
          href={`/login?next=/courses/${courseSlug}/homeworks/${homeworkId}/edit`}
          className="mt-3 inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-white hover:bg-[#1e5d8f]"
        >
          {messages.login}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        {error ?? messages.homeworksError}
      </div>
    );
  }

  if (!data.canEdit) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        {messages.homeworksNotAllowed}
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/courses/${courseSlug}/homeworks/${homeworkId}`} className="text-sm text-[#1e5d8f] hover:underline">
              &larr; {messages.problemBackToDetail}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[#003865]">{messages.homeworksEdit}</h1>
          </div>
        </div>
        <HomeworkForm courseSlug={courseSlug} mode="edit" homeworkId={homeworkId} initialData={data} />
      </div>
    </div>
  );
}
