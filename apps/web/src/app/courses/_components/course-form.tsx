'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { createCourse, updateCourse, type CreateCoursePayload, type UpdateCoursePayload } from "@/lib/api/course";
import type { CourseDetail, CourseEnrollmentType, CourseSummary } from "@/types/course";

type EnrollmentOption = CourseEnrollmentType;

type InitialDataWithToken = CourseDetail & {
  joinToken?: string;
  isPublicListed?: boolean;
};

type Props = {
  mode?: "create" | "edit";
  courseSlug?: string;
  initialData?: InitialDataWithToken;
  accessToken: string | null;
  onSuccess?: (course: CourseSummary | CourseDetail) => void;
};

const ENROLLMENT_OPTIONS: EnrollmentOption[] = ["INVITE_ONLY", "APPROVAL", "BY_LINK", "PUBLIC"];

const ERROR_TRANSLATIONS: Record<string, string> = {
  "Slug already exists": "此網址代碼已被使用",
  "Course not found": "找不到課程",
  "Unauthorized": "請先登入",
  "Forbidden": "沒有權限執行此操作",
};

function translateError(message: string): string {
  return ERROR_TRANSLATIONS[message] || message;
}

export function CourseForm({ mode = "create", courseSlug, initialData, accessToken, onSuccess }: Props) {
  const { messages } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [term, setTerm] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentOption>("INVITE_ONLY");
  const [isPublicListed, setIsPublicListed] = useState(mode === "create");
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set initial values in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setName(initialData.name || "");
      setSlug(initialData.slug || "");
      setTerm(initialData.term || "");
      setDescription(initialData.description || "");
      const validEnrollmentType = ENROLLMENT_OPTIONS.includes(initialData.enrollmentType)
        ? initialData.enrollmentType
        : "INVITE_ONLY";
      setEnrollmentType(validEnrollmentType);
      setIsPublicListed(initialData.isPublicListed ?? false);
      setJoinToken(initialData.joinToken ?? null);
    }
  }, [mode, initialData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName) {
      setError(mode === "edit" ? messages.courseEditNameRequired : messages.courseCreateNameRequired);
      return;
    }
    if (!trimmedSlug || trimmedSlug.length < 3 || trimmedSlug.length > 30) {
      setError("網址代碼須為 3-30 個字元");
      return;
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmedSlug)) {
      setError("網址代碼只能包含小寫英文、數字和連字號，且不能以連字號開頭或結尾");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "edit" && courseSlug) {
        const payload: UpdateCoursePayload = {
          name: trimmedName,
          slug: trimmedSlug,
          term: term.trim() || undefined,
          description: trimmedDescription === "" ? "" : trimmedDescription,
          enrollmentType,
          isPublicListed,
        };
        const course = await updateCourse(courseSlug, payload, accessToken);
        setSuccess(messages.courseEditSuccess);
        // Update joinToken if returned
        if ('joinToken' in course && course.joinToken) {
          setJoinToken(course.joinToken as string);
        }
        onSuccess?.(course);
        router.push(`/courses/${course.slug}`);
      } else {
        const payload: CreateCoursePayload = {
          name: trimmedName,
          slug: trimmedSlug,
          term: term.trim() || undefined,
          description: trimmedDescription || undefined,
          enrollmentType,
          isPublicListed,
        };
        const course = await createCourse(payload, accessToken);
        setSuccess(messages.courseCreateSuccess);
        onSuccess?.(course);
        if (course?.slug) {
          router.push(`/courses/${course.slug}`);
        } else {
          router.push("/courses");
        }
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : (mode === "edit" ? messages.courseEditError : messages.courseCreateError);
      setError(translateError(rawMessage));
    } finally {
      setSubmitting(false);
    }
  };

  const isEditMode = mode === "edit";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="name">
          {isEditMode ? messages.courseEditNameLabel : messages.courseCreateNameLabel}
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
          placeholder={isEditMode ? messages.courseEditNamePlaceholder : messages.courseCreateNamePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="slug">
          網址代碼 (slug)<span className="ml-1 text-red-500">*</span>
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={30}
          pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base font-mono focus:border-[#1e5d8f] focus:outline-none"
          placeholder="data-structure"
        />
        <p className="text-xs text-gray-500">用於課程網址，例如 /courses/data-structure</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="term">
          {isEditMode ? messages.courseEditTermLabel : messages.courseCreateTermLabel}
        </label>
        <input
          id="term"
          name="term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={50}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
          placeholder={isEditMode ? messages.courseEditTermPlaceholder : messages.courseCreateTermPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="description">
          {isEditMode ? messages.courseEditDescriptionLabel : messages.courseCreateDescriptionLabel}
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
          placeholder={isEditMode ? messages.courseEditDescriptionPlaceholder : messages.courseCreateDescriptionPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isPublicListed}
            onChange={(e) => setIsPublicListed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-400 text-[#003865] focus:ring-[#1e5d8f]"
          />
          <div>
            <span className="text-sm font-medium text-gray-800">顯示在公開課程列表</span>
            <p className="text-xs text-gray-500">關閉後，此課程不會公開出現在課程列表中。</p>
          </div>
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-800">
          {isEditMode ? messages.courseEditEnrollmentTypeLabel : messages.courseCreateEnrollmentTypeLabel}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENROLLMENT_OPTIONS.map((value) => {
            const labels: Record<EnrollmentOption, string> = {
              INVITE_ONLY: messages.coursesEnrollInvite,
              APPROVAL: "申請加入（需審核）",
              BY_LINK: "連結加入",
              PUBLIC: messages.coursesEnrollPublic,
            };
            const descriptions: Record<EnrollmentOption, string> = {
              INVITE_ONLY: "僅限教師邀請學生加入",
              APPROVAL: "學生可申請，教師審核後加入",
              BY_LINK: "透過專屬連結直接加入",
              PUBLIC: "任何人都可以直接加入",
            };
            return (
              <label
                key={value}
                className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                  enrollmentType === value
                    ? "border-[#003865] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="enrollmentType"
                    value={value}
                    checked={enrollmentType === value}
                    onChange={() => setEnrollmentType(value)}
                    className="h-4 w-4 border-gray-400 text-[#003865] focus:ring-[#1e5d8f]"
                  />
                  <span className="text-sm font-medium text-gray-800">{labels[value]}</span>
                </div>
                <p className="ml-6 mt-1 text-xs text-gray-500">{descriptions[value]}</p>
              </label>
            );
          })}
        </div>

        {enrollmentType === "BY_LINK" && joinToken ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-medium text-gray-800">加入連結</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/courses/join/${joinToken}`}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/courses/join/${joinToken}`);
                }}
                className="rounded-md bg-[#003865] px-3 py-2 text-sm text-white hover:bg-[#1e5d8f]"
              >
                複製
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">分享此連結給學生，他們可直接加入課程</p>
          </div>
        ) : enrollmentType === "BY_LINK" && !joinToken && mode === "create" ? (
          <p className="text-sm text-gray-600">建立課程後將自動產生加入連結</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
      >
        {submitting
          ? `${isEditMode ? messages.courseEditSubmit : messages.courseCreateSubmit}...`
          : isEditMode ? messages.courseEditSubmit : messages.courseCreateSubmit}
      </button>
    </form>
  );
}
