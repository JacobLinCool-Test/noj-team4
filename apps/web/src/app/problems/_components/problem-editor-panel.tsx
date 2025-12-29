'use client';

import type { ReactNode } from "react";
import Link from "next/link";

type ProblemEditorPanelProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  extraSections?: ReactNode;
  headerActions?: ReactNode;
};

export function ProblemEditorPanel({
  backHref,
  backLabel,
  title,
  subtitle,
  children,
  extraSections,
  headerActions,
}: ProblemEditorPanelProps) {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {backHref && backLabel ? (
          <div className="mb-4 flex items-center justify-between">
            <Link href={backHref} className="text-sm text-[#003865] hover:underline">
              &larr; {backLabel}
            </Link>
            {headerActions}
          </div>
        ) : headerActions ? (
          <div className="mb-4 flex justify-end">{headerActions}</div>
        ) : null}

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle ? <p className="mb-6 text-sm text-gray-600">{subtitle}</p> : null}
            {children}
          </div>
          {extraSections}
        </div>
      </div>
    </div>
  );
}
