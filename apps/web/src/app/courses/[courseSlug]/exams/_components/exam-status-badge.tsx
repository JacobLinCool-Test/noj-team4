'use client';

import type { ExamStatus } from "@/types/exam";

type Props = {
  status: ExamStatus;
};

export function ExamStatusBadge({ status }: Props) {
  const statusConfig: Record<ExamStatus, { label: string; className: string }> = {
    UPCOMING: {
      label: "即將開始",
      className: "bg-blue-100 text-blue-800",
    },
    ONGOING: {
      label: "進行中",
      className: "bg-green-100 text-green-800",
    },
    ENDED: {
      label: "已結束",
      className: "bg-gray-100 text-gray-800",
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
