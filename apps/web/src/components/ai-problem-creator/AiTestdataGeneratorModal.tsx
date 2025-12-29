'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import * as api from '@/lib/api/ai-problem-creator';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  problemDescription: string;
  inputFormat: string;
  outputFormat: string;
  sampleCases: { input: string; output: string }[];
  onTestdataGenerated: (result: {
    testdataKey: string;
    testCases: api.TestCaseResult[];
  }) => void;
};

type Step = 'input' | 'generating' | 'result' | 'error';

export function AiTestdataGeneratorModal({
  isOpen,
  onClose,
  problemDescription,
  inputFormat,
  outputFormat,
  sampleCases,
  onTestdataGenerated,
}: Props) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<Step>('input');
  const [numTestCases, setNumTestCases] = useState(10);
  const [testCases, setTestCases] = useState<api.TestCaseResult[]>([]);
  const [testdataKey, setTestdataKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = useCallback(async () => {
    setStep('generating');
    setError(null);
    setProgress(0);

    try {
      // Start a session for testdata generation
      const session = await api.startSession(accessToken);

      // Generate testdata only
      const result = await api.generateTestdataOnly(
        {
          problemDescription,
          inputFormat,
          outputFormat,
          sampleCases,
          numTestCases,
        },
        accessToken,
      );

      if (result.success && result.testCases && result.testdataKey) {
        setTestCases(result.testCases);
        setTestdataKey(result.testdataKey);
        setStep('result');
      } else {
        setError(result.error || 'Failed to generate test data');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test data');
      setStep('error');
    }
  }, [accessToken, problemDescription, inputFormat, outputFormat, sampleCases, numTestCases]);

  const handleConfirm = () => {
    if (testdataKey && testCases.length > 0) {
      onTestdataGenerated({
        testdataKey,
        testCases,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('input');
    setTestCases([]);
    setTestdataKey(null);
    setError(null);
    setProgress(0);
    onClose();
  };

  const handleRetry = () => {
    setStep('input');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI 測資生成器</h2>
              <p className="text-sm text-white/70">
                {step === 'input' && '設定測資數量'}
                {step === 'generating' && '正在生成測資...'}
                {step === 'result' && '測資生成完成'}
                {step === 'error' && '發生錯誤'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={step === 'generating'}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Problem Info Preview */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-medium text-gray-900">題目資訊</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="line-clamp-3">{problemDescription || '（無題目描述）'}</p>
                  {sampleCases.length > 0 && (
                    <p className="text-gray-500">已有 {sampleCases.length} 個範例測資</p>
                  )}
                </div>
              </div>

              {/* Number of test cases */}
              <div>
                <label className="mb-2 block font-medium text-gray-900">
                  生成測資數量
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={numTestCases}
                    onChange={(e) => setNumTestCases(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium text-gray-900">{numTestCases}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  AI 將根據題目描述生成 {numTestCases} 組測資
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">AI 將執行以下步驟：</p>
                    <ol className="mt-1 list-inside list-decimal space-y-1 text-blue-600">
                      <li>分析題目描述與輸入/輸出格式</li>
                      <li>生成標準解答程式碼</li>
                      <li>產生測資輸入</li>
                      <li>執行解答程式獲得正確輸出</li>
                      <li>打包測資供題目使用</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
              <p className="text-lg font-medium text-gray-900">正在生成測資...</p>
              <p className="mt-2 text-gray-500">AI 正在分析題目並產生測資</p>
              <div className="mt-6 w-64">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              {/* Success message */}
              <div className="flex items-center gap-4 rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-800">測資生成完成！</p>
                  <p className="text-sm text-green-600">已成功生成 {testCases.length} 組測資</p>
                </div>
              </div>

              {/* Test case summary */}
              <div>
                <h3 className="mb-3 font-medium text-gray-900">測資概覽</h3>
                <div className="rounded-lg border border-gray-200 divide-y">
                  {testCases.slice(0, 5).map((tc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                          tc.isSample
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tc.isSample ? '範例' : `測資 ${idx + 1}`}
                        </span>
                        <span className="font-mono text-sm text-gray-600">
                          {tc.input.slice(0, 30)}...
                        </span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        tc.status === 'SUCCESS'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {tc.status === 'SUCCESS' ? '成功' : '失敗'}
                      </span>
                    </div>
                  ))}
                  {testCases.length > 5 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      還有 {testCases.length - 5} 組測資...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900">生成失敗</p>
              <p className="mt-2 text-center text-gray-500">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end gap-3">
            {step === 'input' && (
              <>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  開始生成
                </button>
              </>
            )}

            {step === 'result' && (
              <>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  使用此測資
                </button>
              </>
            )}

            {step === 'error' && (
              <>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  關閉
                </button>
                <button
                  onClick={handleRetry}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  重試
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
