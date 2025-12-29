'use client';

import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { leaveCourse } from "@/lib/api/course";
import type { CourseDetail, CourseRole } from "@/types/course";

type CourseLeaveButtonProps = {
  courseSlug: string;
  myRole: CourseRole | null;
  accessToken?: string | null;
  onLeft?: (course: CourseDetail) => void;
};

export function CourseLeaveButton({ courseSlug, myRole, accessToken, onLeft }: CourseLeaveButtonProps) {
  const { messages } = useI18n();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!myRole) return null;

  const handleLeave = async () => {
    setError(null);

    const confirmed = window.confirm(messages.courseLeaveConfirm);
    if (!confirmed) return;

    setLeaving(true);
    try {
      const detail = await leaveCourse(courseSlug, accessToken);
      onLeft?.(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      if (message === "LAST_TEACHER_CANNOT_LEAVE") {
        setError(messages.courseLeaveLastTeacher);
      } else {
        setError(message || messages.courseLeaveError);
      }
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLeave}
        disabled={leaving}
        className="rounded-md border border-[#003865] bg-white px-4 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865] hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-50 disabled:text-gray-500 disabled:hover:bg-gray-50 disabled:hover:text-gray-500"
      >
        {leaving ? messages.courseLeaveSubmitting : messages.courseLeaveButton}
      </button>
      {error ? <p className="text-xs text-red-600 text-right">{error}</p> : null}
    </div>
  );
}
