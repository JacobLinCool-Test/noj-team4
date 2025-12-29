'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { joinCoursePublic } from "@/lib/api/course";
import {
  submitJoinRequest,
  listMyJoinRequests,
  cancelMyJoinRequest,
  type CourseJoinRequest,
} from "@/lib/api/course-join-request";
import type { CourseEnrollmentType, CourseRole } from "@/types/course";
import { useI18n } from "@/i18n/useI18n";

type CourseJoinSectionProps = {
  courseSlug: string;
  enrollmentType: CourseEnrollmentType;
  myRole: CourseRole | null;
  isLoggedIn: boolean;
  accessToken: string | null;
  onJoined: () => void;
};

export function CourseJoinSection({
  courseSlug,
  enrollmentType,
  myRole,
  isLoggedIn,
  accessToken,
  onJoined,
}: CourseJoinSectionProps) {
  const { messages } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRequest, setMyRequest] = useState<CourseJoinRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);

  // Fetch my pending request for this course if APPROVAL mode
  const fetchMyRequest = useCallback(async () => {
    if (!accessToken || enrollmentType !== "APPROVAL") return;
    setLoadingRequest(true);
    try {
      const requests = await listMyJoinRequests(accessToken);
      const found = requests.find(
        (r) => r.course.slug === courseSlug && r.status === "PENDING"
      );
      setMyRequest(found ?? null);
    } catch {
      // ignore errors
    } finally {
      setLoadingRequest(false);
    }
  }, [accessToken, courseSlug, enrollmentType]);

  useEffect(() => {
    fetchMyRequest();
  }, [fetchMyRequest]);

  if (myRole !== null) return null;
  // INVITE_ONLY and BY_LINK don't show join section here
  if (enrollmentType === "INVITE_ONLY" || enrollmentType === "BY_LINK") return null;

  if (!isLoggedIn) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-amber-800">{messages.courseDetailNotLoggedIn}</h3>
        <p className="mt-2 text-sm text-amber-900">{messages.courseDetailJoinLoginHint}</p>
        <div className="mt-3">
          <Link
            href={`/login?next=/courses/${courseSlug}`}
            className="inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            {messages.courseDetailLoginCta}
          </Link>
        </div>
      </section>
    );
  }

  const handleJoinPublic = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await joinCoursePublic(courseSlug, accessToken);
      onJoined();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.courseJoinError;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = await submitJoinRequest(courseSlug, accessToken);
      setMyRequest(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : "申請失敗";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!myRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      await cancelMyJoinRequest(myRequest.id, accessToken);
      setMyRequest(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "撤回失敗";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPublicButton = () => (
    <button
      type="button"
      onClick={handleJoinPublic}
      disabled={submitting}
      className="mt-3 inline-flex min-w-[110px] items-center justify-center rounded-md bg-[#003865] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e5d8f] disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {submitting ? messages.courseJoinSubmitting : messages.courseJoinSubmit}
    </button>
  );

  const renderApprovalSection = () => {
    if (loadingRequest) {
      return <p className="mt-3 text-sm text-gray-500">載入中...</p>;
    }

    if (myRequest) {
      return (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              審核中
            </span>
            <span className="text-sm text-gray-600">
              申請時間：{new Date(myRequest.createdAt).toLocaleString("zh-TW")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancelRequest}
            disabled={submitting}
            className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {submitting ? "撤回中..." : "撤回申請"}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleSubmitRequest}
        disabled={submitting}
        className="mt-3 inline-flex min-w-[110px] items-center justify-center rounded-md bg-[#003865] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e5d8f] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {submitting ? "申請中..." : "申請加入"}
      </button>
    );
  };

  const getDescription = () => {
    switch (enrollmentType) {
      case "APPROVAL":
        return "此課程需要教師審核才能加入。提交申請後，請等待教師批准。";
      case "PUBLIC":
        return messages.courseJoinDescriptionPublic;
      default:
        return "";
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#003865]">{messages.courseJoinTitle}</h3>
      <p className="mt-2 text-sm text-gray-700">{getDescription()}</p>
      {enrollmentType === "PUBLIC" && renderPublicButton()}
      {enrollmentType === "APPROVAL" && renderApprovalSection()}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <p className="mt-3 text-xs text-gray-500">{messages.courseDetailJoinToView}</p>
    </section>
  );
}
