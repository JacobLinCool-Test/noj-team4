"use client";

import { useI18n } from "@/i18n/useI18n";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export default function PrivacyPolicyPage() {
  const { messages } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-[#003865] to-[#1e5d8f] px-6 py-8 sm:px-8">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {messages.privacyPolicyTitle}
            </h1>
            <p className="mt-2 text-sm text-white/80">
              {messages.privacyPolicyLastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-8">
            <MarkdownRenderer content={messages.privacyPolicyContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
