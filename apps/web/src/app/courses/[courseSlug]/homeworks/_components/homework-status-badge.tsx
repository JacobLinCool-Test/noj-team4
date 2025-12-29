'use client';

import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { HomeworkStatus } from "@/types/homework";

export function HomeworkStatusBadge({ status }: { status: HomeworkStatus }) {
  const { messages } = useI18n();
  const { label, className } = useMemo(() => {
    switch (status) {
      case "UPCOMING":
        return { label: messages.homeworksStatusUpcoming, className: "bg-amber-100 text-amber-800" };
      case "ONGOING":
        return { label: messages.homeworksStatusOngoing, className: "bg-green-100 text-green-800" };
      case "ENDED":
      default:
        return { label: messages.homeworksStatusEnded, className: "bg-gray-200 text-gray-800" };
    }
  }, [messages, status]);

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
