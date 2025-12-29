'use client';

import { useI18n } from '@/i18n/useI18n';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import type { GeneratedProblem, TestCaseResult } from '@/lib/api/ai-problem-creator';

type Props = {
  problem: GeneratedProblem;
  testCases: TestCaseResult[];
  onPublish: () => void;
  onEdit: () => void;
  onBack: () => void;
  error: string | null;
  autoTranslate: boolean;
  onAutoTranslateChange: (value: boolean) => void;
};

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
};

export function PublishConfirmation({
  problem,
  testCases,
  onPublish,
  onEdit,
  onBack,
  error,
  autoTranslate,
  onAutoTranslateChange,
}: Props) {
  const { messages: t } = useI18n();
  const sampleCount = testCases.filter((tc) => tc.isSample).length;
  const hiddenCount = testCases.filter((tc) => !tc.isSample).length;
  const allPassed = testCases.every((tc) => tc.status === 'SUCCESS');

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary Card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
          <h3 className="mb-4 text-xl font-bold text-gray-900">{t.aiProblemCreatorPublishReady}</h3>

          <div className="grid grid-cols-2 gap-6">
            {/* Problem Info */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-700">{t.aiProblemCreatorPublishProblemDetails}</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorEditorTitle}</dt>
                  <dd className="font-medium text-gray-900">{problem.title}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorEditorDifficulty}</dt>
                  <dd>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                      {problem.difficulty}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorEditorTags}</dt>
                  <dd className="flex flex-wrap gap-1">
                    {problem.tags.map((tag) => (
                      <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorConstraints}</dt>
                  <dd className="font-medium text-gray-900">
                    {t.aiProblemCreatorTimeLimit.replace('{ms}', String(problem.constraints.timeLimitMs))}
                  </dd>
                  <dd className="font-medium text-gray-900">
                    {t.aiProblemCreatorMemoryLimit.replace('{mb}', String(Math.round(problem.constraints.memoryLimitKb / 1024)))}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Test Data Info */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-700">{t.aiProblemCreatorPublishTestData}</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorSampleTestcases}</dt>
                  <dd className="font-medium text-gray-900">{sampleCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorPublishHiddenCases}</dt>
                  <dd className="font-medium text-gray-900">{hiddenCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorPublishTotal}</dt>
                  <dd className="font-medium text-gray-900">{testCases.length}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t.aiProblemCreatorPublishStatus}</dt>
                  <dd>
                    {allPassed ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t.aiProblemCreatorPublishAllPassed}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {t.aiProblemCreatorPublishSomeIssues}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Description Preview */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold text-gray-700">{t.aiProblemCreatorPublishDescPreview}</h4>
          <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-4">
            <MarkdownRenderer content={problem.description} />
          </div>
        </div>

        {/* Sample Cases Preview */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold text-gray-700">{t.aiProblemCreatorSampleTestcases}</h4>
          <div className="space-y-2">
            {problem.sampleCases.map((sample, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorInput} {index + 1}</p>
                  <pre className="text-xs text-gray-700">{sample.input}</pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorOutput} {index + 1}</p>
                  <pre className="text-xs text-gray-700">{sample.output}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto Translate Option */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => onAutoTranslateChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#003865]"
            />
            <div>
              <p className="font-medium text-gray-900">{t.aiProblemCreatorPublishAutoTranslate || 'AI 自動翻譯'}</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {t.aiProblemCreatorPublishAutoTranslateDesc || '發布後自動將題目翻譯成另一種語言（中文 ↔ 英文）'}
              </p>
            </div>
          </label>
        </div>

        {/* Visibility Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-blue-800">{t.aiProblemCreatorPublishBeforePublishing}</p>
              <p className="mt-1 text-sm text-blue-700">
                {t.aiProblemCreatorPublishVisibilityNotice}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex justify-between">
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.aiProblemCreatorPublishBack}
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.aiProblemCreatorPreviewEdit}
            </button>
          </div>
          <button
            onClick={onPublish}
            className="rounded-lg bg-gradient-to-r from-[#003865] to-[#1e5d8f] px-8 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow"
          >
            {t.aiProblemCreatorPublishProblem}
          </button>
        </div>
      </div>
    </div>
  );
}
