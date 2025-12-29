'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  createSubmission,
  createSubmissionWithZip,
  testCode,
  type ProgrammingLanguage,
  type CodeTestResponse,
} from '@/lib/api/submission';
import { getPipelineConfig, type SubmissionType } from '@/lib/api/pipeline';
import { CodeEditor } from '@/components/code-editor';
import { ZipUploader } from './zip-uploader';

interface SubmissionFormProps {
  problemDisplayId: string;
  allowedLanguages: string[];
  courseId?: number;
  homeworkId?: string;
}

export default function SubmissionForm({
  problemDisplayId,
  allowedLanguages,
  courseId,
  homeworkId,
}: SubmissionFormProps) {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [language, setLanguage] = useState<ProgrammingLanguage | 'AUTO'>('AUTO');
  const [source, setSource] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [testResult, setTestResult] = useState<CodeTestResponse | null>(null);
  const hasDetectedLanguage = useRef(false);
  const isCustomInputRun = showCustomInput && customInput.length > 0;

  // Pipeline config (for submission type)
  const [submissionType, setSubmissionType] = useState<SubmissionType>('SINGLE_FILE');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load pipeline config to determine submission type
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getPipelineConfig(problemDisplayId, accessToken);
        if (config.submissionType) {
          setSubmissionType(config.submissionType);
        }
      } catch (err) {
        // If failed to load config, default to SINGLE_FILE
        console.error('Failed to load pipeline config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, [problemDisplayId, accessToken]);

  const isMultiFileMode = submissionType === 'MULTI_FILE';

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      AUTO: messages.submissionLanguageAuto,
      C: messages.submissionLanguageC,
      CPP: messages.submissionLanguageCPP,
      JAVA: messages.submissionLanguageJava,
      PYTHON: messages.submissionLanguagePython,
    };
    return labels[lang] || lang;
  };

  // Auto-detect programming language from source code
  const detectLanguage = (code: string): ProgrammingLanguage | null => {
    if (!code.trim()) return null;

    // Java detection (check first - Java imports are very specific)
    // Matches: import java., public class, public static void main
    if (
      /^\s*import\s+java\./m.test(code) ||
      /\b(public|private|protected)\s+(class|interface)\s+\w+/.test(code) ||
      /public\s+static\s+void\s+main\s*\(/.test(code) ||
      /^\s*package\s+[\w.]+\s*;/m.test(code)
    ) {
      return 'JAVA';
    }

    // C++ detection: iostream, cout, cin, std::, using namespace std
    if (
      /#include\s*<(iostream|vector|algorithm|string|map|set|queue|stack|cmath|bits\/stdc\+\+\.h)>/.test(code) ||
      /\b(cout|cin|std::)\b/.test(code) ||
      /using\s+namespace\s+std/.test(code)
    ) {
      return 'CPP';
    }

    // C detection: stdio.h, printf, scanf
    if (
      /#include\s*<(stdio\.h|stdlib\.h|string\.h|math\.h)>/.test(code) ||
      /\b(printf|scanf)\s*\(/.test(code)
    ) {
      return 'C';
    }

    // Python detection (check last - most generic patterns)
    // Matches: def, from X import, class X:, print()
    // Note: Python imports don't have semicolons
    if (
      /^\s*def\s+\w+\s*\(/m.test(code) ||
      /^\s*from\s+\w+\s+import\b/m.test(code) ||
      /^\s*import\s+\w+\s*$/m.test(code) ||
      /^\s*class\s+\w+.*:/m.test(code) ||
      /\bprint\s*\(/.test(code)
    ) {
      return 'PYTHON';
    }

    return null;
  };

  // Auto-detect language when code changes (only once when language is AUTO)
  useEffect(() => {
    if (language === 'AUTO' && !hasDetectedLanguage.current && source.trim()) {
      const detected = detectLanguage(source);
      if (detected && allowedLanguages.includes(detected)) {
        setLanguage(detected);
        hasDetectedLanguage.current = true;
      }
    }
  }, [source, language, allowedLanguages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError(messages.coursesLoginRequired);
      return;
    }

    // Validation based on submission mode
    if (isMultiFileMode) {
      if (!zipFile) {
        setError('請上傳 ZIP 檔案');
        return;
      }
    } else {
      if (!source.trim()) {
        setError(messages.testErrorCodeRequired);
        return;
      }
    }

    if (language === 'AUTO') {
      setError('請先選擇使用的程式語言');
      return;
    }

    setSubmitting(true);

    try {
      let result: { submissionId: string };

      if (isMultiFileMode && zipFile) {
        // ZIP file submission
        result = await createSubmissionWithZip(
          problemDisplayId,
          zipFile,
          {
            language: language as ProgrammingLanguage,
            courseId,
            homeworkId,
          },
          accessToken,
        );
      } else {
        // Regular source code submission
        result = await createSubmission(
          problemDisplayId,
          {
            language: language as ProgrammingLanguage,
            source,
            courseId,
            homeworkId,
          },
          accessToken,
        );
      }

      // Redirect to submission detail page
      router.push(`/submissions/${result.submissionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Map error codes to i18n messages
      const errorMap: Record<string, string> = {
        SUBMISSION_QUOTA_EXCEEDED: messages.submissionErrorQuotaExceeded,
        SUBMISSION_LANGUAGE_NOT_ALLOWED: messages.submissionErrorLanguageNotAllowed,
        HOMEWORK_NOT_STARTED: messages.submissionErrorHomeworkNotStarted,
        HOMEWORK_ENDED: messages.submissionErrorHomeworkEnded,
        NOT_COURSE_MEMBER: messages.submissionErrorNotCourseMember,
        PERMISSION_DENIED: messages.submissionErrorPermissionDenied,
      };

      setError(errorMap[errorMessage] || errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async () => {
    setTestError(null);
    setTestResult(null);

    if (!source.trim()) {
      setTestError(messages.testErrorCodeRequired);
      return;
    }

    if (language === 'AUTO') {
      setTestError('請先選擇使用的程式語言');
      return;
    }

    setTesting(true);

    try {
      const customInputValue =
        showCustomInput && customInput.length > 0 ? customInput : undefined;
      const result = await testCode(
        problemDisplayId,
        {
          language: language as ProgrammingLanguage,
          source,
          customInput: customInputValue,
          homeworkId,
        },
        accessToken,
      );

      setTestResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'AC':
        return 'bg-green-100 text-green-800';
      case 'WA':
        return 'bg-red-100 text-red-800';
      case 'CE':
        return 'bg-yellow-100 text-yellow-800';
      case 'TLE':
        return 'bg-orange-100 text-orange-800';
      case 'MLE':
        return 'bg-purple-100 text-purple-800';
      case 'RE':
        return 'bg-red-100 text-red-800';
      case 'OLE':
        return 'bg-orange-100 text-orange-800';
      case 'SA':
        return 'bg-violet-100 text-violet-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTestResultIcon = (passed: boolean) =>
    passed ? (
      <svg
        className="h-4 w-4 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    ) : (
      <svg
        className="h-4 w-4 text-red-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6" />
        <path d="M9 9l6 6" />
      </svg>
    );

  if (authLoading || loadingConfig) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="h-6 w-1/4 rounded bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-100" />
          <div className="h-64 w-full rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <p className="text-center text-yellow-700">
          {messages.coursesLoginRequired}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {messages.submissionSubmit}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Language selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {messages.problemFormLanguages}
          </label>
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value as ProgrammingLanguage | 'AUTO';
              setLanguage(newLang);
              // Reset detection flag when user manually changes language
              if (newLang !== 'AUTO') {
                hasDetectedLanguage.current = true;
              } else {
                hasDetectedLanguage.current = false;
              }
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
          >
            <option value="AUTO">{getLanguageLabel('AUTO')}</option>
            {allowedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {getLanguageLabel(lang)}
              </option>
            ))}
          </select>
        </div>

        {/* Code editor or ZIP uploader based on submission type */}
        {isMultiFileMode ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              上傳程式碼 (ZIP 格式)
            </label>
            <ZipUploader
              file={zipFile}
              onFileChange={setZipFile}
              maxSizeMb={10}
              disabled={submitting}
            />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {messages.submissionCode}
            </label>
            <CodeEditor
              value={source}
              onChange={setSource}
              language={language}
              height="400px"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Custom input toggle - only for single file mode */}
        {!isMultiFileMode && (
          <div>
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="text-sm text-[#003865] hover:underline"
            >
              {showCustomInput ? messages.testCustomInputHide : messages.testCustomInputShow}
            </button>
          </div>
        )}

        {/* Custom input textarea - only for single file mode */}
        {!isMultiFileMode && showCustomInput && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {messages.testCustomInputLabel}
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={messages.testCustomInputPlaceholder}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between gap-3">
          {/* Test button - only shown for single file mode */}
          {!isMultiFileMode && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !source.trim()}
              className="rounded-md bg-gray-600 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? messages.testButtonTesting : messages.testButton}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || (isMultiFileMode ? !zipFile : !source.trim())}
            className={`rounded-md bg-[#003865] px-6 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:cursor-not-allowed disabled:opacity-50 ${isMultiFileMode ? 'ml-auto' : ''}`}
          >
            {submitting ? messages.submissionSubmitting : messages.submissionSubmit}
          </button>
        </div>
      </form>

      {/* Test error message */}
      {testError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{testError}</p>
        </div>
      )}

      {/* Test results */}
      {testResult && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{messages.testResultsTitle}</h3>

          {/* Compile result */}
          {testResult.compileStatus === 'CE' ? (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                  {messages.testResultCompileError}
                </span>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-900 p-3 text-sm text-gray-100">
                {testResult.compileLog}
              </pre>
            </div>
          ) : (
            <>
              {/* Test cases */}
              <div className="space-y-3">
                {testResult.results.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {result.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {result.timeMs !== undefined && (
                          <span className="text-sm text-gray-600">
                            {result.timeMs}ms
                          </span>
                        )}
                        {!isCustomInputRun && (
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeColor(result.status)}`}
                          >
                            {result.status === 'RUNNING' ? 'AC' : result.status}
                          </span>
                        )}
                        {!isCustomInputRun && result.passed !== undefined && (
                          <span
                            className={`flex items-center gap-1 text-sm font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {renderTestResultIcon(result.passed)}
                            {result.passed
                              ? messages.testResultPassed
                              : messages.testResultFailed}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Output */}
                    {result.stdout && (
                      <div className="mt-3">
                        <p className="mb-1 text-sm font-medium text-gray-700">
                          {messages.testResultOutput}
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm text-gray-900">
                          {result.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Error output */}
                    {result.stderr && (
                      <div className="mt-3">
                        <p className="mb-1 text-sm font-medium text-gray-700">
                          {messages.testResultError}
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-red-50 p-3 text-sm text-red-900">
                          {result.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
