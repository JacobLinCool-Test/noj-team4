'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { CourseForm } from "../_components/course-form";

export default function NewCoursePage() {
  const { messages } = useI18n();
  const { accessToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login?next=/courses/new");
    }
  }, [accessToken, router]);

  if (!accessToken) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">{messages.courseCreateLoginRequired}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-[#003865]">{messages.courseCreateTitle}</h1>
          <p className="text-sm text-gray-700">{messages.courseCreateSubtitle}</p>
        </div>
        <CourseForm accessToken={accessToken} />
      </div>
    </div>
  );
}
