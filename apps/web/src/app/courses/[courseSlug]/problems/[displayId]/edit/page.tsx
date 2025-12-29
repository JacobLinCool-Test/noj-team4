'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { getCourseProblem, type CourseProblemDetailResponse } from "@/lib/api/course-problem";
import { ProblemForm } from "@/app/problems/_components/problem-form";
import { PipelineConfig } from "@/app/problems/[displayId]/_components/pipeline-config";
import { TestdataUploader } from "@/app/problems/_components/testdata-uploader";
import { ProblemEditorPanel } from "@/app/problems/_components/problem-editor-panel";

export default function EditCourseProblemPage() {
  const params = useParams();
  const courseSlug = params.courseSlug as string;
  const displayId = params.displayId as string;
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();

  const [data, setData] = useState<CourseProblemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseSlug || !displayId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCourseProblem(courseSlug, displayId, accessToken)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : messages.errorGeneric);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseSlug, displayId, accessToken, messages.errorGeneric]);

  if (authLoading || loading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="h-8 w-1/3 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-1/4 rounded bg-gray-100" />
            <div className="mt-6 h-40 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center shadow-sm">
          <p className="text-yellow-800">{messages.courseDetailNotLoggedIn}</p>
          <Link
            href={`/login?next=/courses/${courseSlug}/problems/${displayId}/edit`}
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.courseDetailLoginCta}
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-red-700">{error}</p>
          <Link
            href={`/courses/${courseSlug}/problems`}
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.courseProblemsBackToList}
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <ProblemEditorPanel
      backHref={`/courses/${courseSlug}/problems/${displayId}`}
      backLabel={messages.problemBackToDetail}
      title={messages.courseProblemEditTitle}
      subtitle={messages.courseProblemEditSubtitle.replace("{displayId}", data.problem.displayId)}
      extraSections={
        <>
          <PipelineConfig problemDisplayId={data.problem.displayId} />
          <TestdataUploader problemDisplayId={data.problem.displayId} />
        </>
      }
    >
      <ProblemForm
        mode="edit"
        context="course"
        courseSlug={courseSlug}
        initialData={data.problem}
        courseSettings={{
          quota: data.courseSettings.quota,
        }}
      />
    </ProblemEditorPanel>
  );
}
