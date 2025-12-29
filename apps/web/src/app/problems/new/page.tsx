'use client';

import { useState } from 'react';
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { ProblemForm } from "../_components/problem-form";
import { ProblemEditorPanel } from "../_components/problem-editor-panel";
import { AiProblemCreatorModal } from "@/components/ai-problem-creator";

export default function NewProblemPage() {
  const { messages } = useI18n();
  const { user, loading } = useAuth();
  const [showAiModal, setShowAiModal] = useState(false);

  if (loading) {
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
          <p className="text-yellow-800">{messages.problemCreateLoginRequired}</p>
          <Link
            href="/login?next=/problems/new"
            className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
          >
            {messages.login}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProblemEditorPanel
        backHref="/problems"
        backLabel={messages.problemBackToList}
        title={messages.problemCreateTitle}
        subtitle={messages.problemCreateSubtitle}
        headerActions={
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {messages.aiProblemCreatorButton}
          </button>
        }
      >
        <ProblemForm mode="create" context="public" variant="public" />
      </ProblemEditorPanel>

      <AiProblemCreatorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
      />
    </>
  );
}
