'use client';

import { useI18n } from '@/i18n/useI18n';
import { CodeEditor } from '@/components/code-editor';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import type { GeneratedProblem, GeneratedSolution } from '@/lib/api/ai-problem-creator';
import type { ProgrammingLanguage } from '@noj/shared-ui';

type Props = {
  problem: GeneratedProblem;
  solution: GeneratedSolution | null;
  onEdit: () => void;
  onGenerateTestdata: () => void;
  onBack: () => void;
  error: string | null;
  cooldownRemaining?: number;
};

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
};

export function ProblemPreview({
  problem,
  solution,
  onEdit,
  onGenerateTestdata,
  onBack,
  error,
  cooldownRemaining = 0,
}: Props) {
  const { messages: t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Title and difficulty */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{problem.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
              {problem.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onEdit}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t.aiProblemCreatorPreviewEdit}
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold text-gray-900">{t.aiProblemCreatorDescription}</h4>
          <div className="rounded-lg bg-gray-50 p-4">
            <MarkdownRenderer content={problem.description} />
          </div>
        </div>

        {/* Input/Output format */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">{t.aiProblemCreatorInputFormat}</h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <MarkdownRenderer content={problem.inputFormat} />
            </div>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">{t.aiProblemCreatorOutputFormat}</h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <MarkdownRenderer content={problem.outputFormat} />
            </div>
          </div>
        </div>

        {/* Sample cases */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold text-gray-900">{t.aiProblemCreatorSampleTestcases}</h4>
          <div className="space-y-3">
            {problem.sampleCases.map((sample, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorInput} {index + 1}</p>
                  <pre className="rounded-lg bg-gray-800 p-3 text-sm text-white overflow-x-auto">
                    {sample.input}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorOutput} {index + 1}</p>
                  <pre className="rounded-lg bg-gray-800 p-3 text-sm text-white overflow-x-auto">
                    {sample.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold text-gray-900">{t.aiProblemCreatorConstraints}</h4>
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg bg-blue-50 px-4 py-2 font-medium text-blue-700">
              {t.aiProblemCreatorTimeLimit.replace('{ms}', String(problem.constraints.timeLimitMs))}
            </div>
            <div className="rounded-lg bg-purple-50 px-4 py-2 font-medium text-purple-700">
              {t.aiProblemCreatorMemoryLimit.replace('{mb}', String(Math.round(problem.constraints.memoryLimitKb / 1024)))}
            </div>
          </div>
        </div>

        {/* Solution code */}
        {solution && (
          <div className="mb-6">
            <h4 className="mb-2 font-semibold text-gray-900">
              {t.aiProblemCreatorPreviewSolutionCode} ({solution.language})
            </h4>
            <CodeEditor
              value={solution.code}
              language={solution.language as ProgrammingLanguage}
              height="300px"
              readOnly
              showFontControls={false}
            />
          </div>
        )}

        {/* Suggested test inputs */}
        {problem.suggestedTestInputs && problem.suggestedTestInputs.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 font-semibold text-gray-900">
              {t.aiProblemCreatorPreviewSuggestedTestInputs} ({problem.suggestedTestInputs.length})
            </h4>
            <p className="mb-2 text-sm text-gray-600">
              {t.aiProblemCreatorPreviewSuggestedTestInputsDesc}
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3">
              {problem.suggestedTestInputs.map((input, index) => (
                <div key={index} className="border-b border-gray-200 py-2 last:border-0">
                  <pre className="text-xs text-gray-700">{input}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
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
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t.aiProblemCreatorPreviewBackToChat}
          </button>
          <button
            onClick={onGenerateTestdata}
            disabled={!solution || !problem.suggestedTestInputs?.length || cooldownRemaining > 0}
            className="rounded-lg bg-[#003865] px-6 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
          >
            {cooldownRemaining > 0
              ? `${t.aiProblemCreatorPreviewGenerateTestData} (${Math.ceil(cooldownRemaining / 1000)}s)`
              : t.aiProblemCreatorPreviewGenerateTestData}
          </button>
        </div>
        {(!solution || !problem.suggestedTestInputs?.length) && (
          <p className="mt-2 text-center text-sm text-amber-600">
            {t.aiProblemCreatorPreviewRequiredHint}
          </p>
        )}
      </div>
    </div>
  );
}
