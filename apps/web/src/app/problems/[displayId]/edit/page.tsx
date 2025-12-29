'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { getProblem, type Problem } from "@/lib/api/problem";
import { ProblemForm } from "../../_components/problem-form";
import { ProblemEditorPanel } from "../../_components/problem-editor-panel";
import { PipelineConfig } from "../_components/pipeline-config";
import { TestdataUploader } from "../../_components/testdata-uploader";

export default function EditProblemPage() {
  const params = useParams();
  const displayId = params.displayId as string;
  const { messages } = useI18n();
  const { user, accessToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayId || authLoading) return;

    const fetchProblem = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProblem(displayId, accessToken);
        setProblem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load problem");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [displayId, accessToken, authLoading]);

  useEffect(() => {
    if (problem?.courseContext?.courseSlug) {
      router.replace(`/courses/${problem.courseContext.courseSlug}/problems/${problem.displayId}/edit`);
    }
  }, [problem, router]);

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
          <p className="text-yellow-800">{messages.problemEditLoginRequired}</p>
          <Link
            href={`/login?next=/problems/${displayId}/edit`}
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.login}
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
            href="/problems"
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.problemBackToList}
          </Link>
        </div>
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  if (problem.courseContext?.courseSlug) {
    return null;
  }

  if (!problem.canEdit) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-red-700">{messages.problemEditNoPermission}</p>
          <Link
            href={`/problems/${problem.displayId}`}
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.problemBackToDetail}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProblemEditorPanel
      backHref={`/problems/${problem.displayId}`}
      backLabel={messages.problemBackToDetail}
      title={messages.problemEditTitle}
      subtitle={messages.problemEditSubtitle.replace("{displayId}", problem.displayId)}
      extraSections={
        <>
          <PipelineConfig problemDisplayId={problem.displayId} />
          <TestdataUploader problemDisplayId={problem.displayId} />
        </>
      }
    >
      <ProblemForm mode="edit" context="public" initialData={problem} variant="public" />
    </ProblemEditorPanel>
  );
}
