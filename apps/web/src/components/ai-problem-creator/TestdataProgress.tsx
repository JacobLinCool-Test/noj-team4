'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/useI18n';
import type { TestCaseResult } from '@/lib/api/ai-problem-creator';

type Props = {
  isGenerating: boolean;
  testCases: TestCaseResult[];
};

export function TestdataProgress({ isGenerating, testCases }: Props) {
  const { messages: t } = useI18n();
  const [progress, setProgress] = useState(0);

  // Fake progress animation: 0% -> 95% over ~5 seconds
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      // Ease-out curve: fast at start, slow at end
      const easedProgress = 1 - Math.pow(1 - currentStep / steps, 3);
      const newProgress = Math.min(95, easedProgress * 95);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isGenerating]);

  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-[#003865] border-t-transparent" />
        <h3 className="text-xl font-semibold text-gray-900">{t.aiProblemCreatorTestdataGenerating}</h3>
        <p className="mt-2 text-center text-gray-600">
          {t.aiProblemCreatorTestdataGeneratingDesc}
        </p>
        <div className="mt-8 w-full max-w-md">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#003865] to-[#1e5d8f] transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Show results if test cases are available
  const successCount = testCases.filter((tc) => tc.status === 'SUCCESS').length;
  const errorCount = testCases.filter((tc) => tc.status === 'ERROR').length;
  const timeoutCount = testCases.filter((tc) => tc.status === 'TIMEOUT').length;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{t.aiProblemCreatorTestdataGenerated}</h3>
        <div className="mt-2 flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">{t.aiProblemCreatorTestdataPassed.replace('{count}', String(successCount))}</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">{t.aiProblemCreatorTestdataErrors.replace('{count}', String(errorCount))}</span>
            </div>
          )}
          {timeoutCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">{t.aiProblemCreatorTestdataTimeouts.replace('{count}', String(timeoutCount))}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {testCases.map((tc) => (
            <div
              key={tc.index}
              className={`rounded-lg border p-4 ${
                tc.status === 'SUCCESS'
                  ? 'border-green-200 bg-green-50'
                  : tc.status === 'TIMEOUT'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {tc.isSample ? t.aiProblemCreatorTestdataSampleCase : t.aiProblemCreatorTestdataTestCase} {tc.index + 1}
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    tc.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-800'
                      : tc.status === 'TIMEOUT'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tc.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorInput}</p>
                  <pre className="max-h-20 overflow-auto rounded bg-white p-2 text-xs">
                    {tc.input}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{t.aiProblemCreatorTestdataExpectedOutput}</p>
                  <pre className="max-h-20 overflow-auto rounded bg-white p-2 text-xs">
                    {tc.output}
                  </pre>
                </div>
              </div>
              {tc.errorMessage && (
                <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700">
                  {tc.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
