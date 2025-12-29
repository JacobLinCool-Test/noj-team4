'use client';

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { getProblem, type Problem } from "@/lib/api/problem";
import { ProblemIDELayout } from "@/app/problems/[displayId]/_components/problem-ide-layout";

export default function CourseProblemDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseSlug = params.courseSlug as string;
  const displayId = params.displayId as string;
  const homeworkId = searchParams.get('homeworkId') || undefined;
  const { accessToken } = useAuth();

  const { data: courseData, loading: courseLoading } = useCourseDetail(courseSlug, accessToken);
  const courseId = courseData?.id;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayId) return;

    const fetchProblem = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProblem(displayId, accessToken, { homeworkId });
        setProblem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load problem");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [displayId, accessToken, homeworkId]);

  if (loading || courseLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="h-5 w-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading problem...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gray-100">
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-red-500">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="mb-4 text-gray-700">{error}</p>
          <Link
            href={`/courses/${courseSlug}/problems`}
            className="inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            Back to Problems
          </Link>
        </div>
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  return (
    <ProblemIDELayout
      problem={problem}
      courseId={courseId}
      homeworkId={homeworkId}
      courseSlug={courseSlug}
      courseName={courseData?.name}
    />
  );
}
