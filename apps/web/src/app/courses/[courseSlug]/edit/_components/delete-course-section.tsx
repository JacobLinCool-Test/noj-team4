'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { deleteCourse } from "@/lib/api/course";

type Props = {
  courseSlug: string;
  courseName: string;
  accessToken?: string | null;
};

export function DeleteCourseSection({ courseSlug, courseName, accessToken }: Props) {
  const { messages } = useI18n();
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const normalizedCourseName = courseName.trim();
  const normalizedConfirmName = confirmName.trim();
  const canDelete = normalizedConfirmName.length > 0 && normalizedConfirmName === normalizedCourseName;

  async function handleDelete() {
    setError(null);
    if (!canDelete) {
      setError(messages.courseDeleteNameMismatch);
      return;
    }

    const ok = window.confirm(messages.courseDeleteConfirmPrompt);
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteCourse(courseSlug, normalizedConfirmName, accessToken);
      router.push("/courses");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || messages.courseDeleteError);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="text-base font-semibold text-red-800">{messages.courseDeleteDangerTitle}</h2>
      <p className="mt-2 text-sm text-red-800">{messages.courseDeleteDangerDescription}</p>

      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-red-900">{messages.courseDeleteConfirmLabel}</label>
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={messages.courseDeleteConfirmPlaceholder.replace("{courseName}", normalizedCourseName)}
          className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none ring-red-200 focus:ring-2"
          disabled={isDeleting}
          autoComplete="off"
          inputMode="text"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete || isDeleting}
        className="mt-4 inline-flex items-center rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? messages.courseDeleteDeleting : messages.courseDeleteButton}
      </button>
    </section>
  );
}
