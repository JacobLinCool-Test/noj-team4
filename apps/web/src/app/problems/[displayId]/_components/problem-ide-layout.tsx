'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/providers/AuthProvider';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { CodeEditor, useIsMobile } from '@/components/code-editor';
import {
  createSubmission,
  createSubmissionWithZip,
  testCode,
  type ProgrammingLanguage,
  type CodeTestResponse,
} from '@/lib/api/submission';
import { getPipelineConfig, type SubmissionType } from '@/lib/api/pipeline';
import { ZipUploader } from './zip-uploader';
import {
  type Problem,
  type ProblemDifficulty,
  type TranslationStatus,
  getTranslationStatus,
  getProblem,
} from '@/lib/api/problem';

interface ProblemIDELayoutProps {
  problem: Problem;
  courseId?: number;
  homeworkId?: string;
  courseSlug?: string;
  courseName?: string;
}

export function ProblemIDELayout({
  problem,
  courseId,
  homeworkId,
  courseSlug,
  courseName,
}: ProblemIDELayoutProps) {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor'>('problem');
  const [mobileInputExpanded, setMobileInputExpanded] = useState(false);
  const [mobileOutputExpanded, setMobileOutputExpanded] = useState(false);

  // Problem data state (for live updates after translation)
  const [currentProblem, setCurrentProblem] = useState<Problem>(problem);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>(
    problem.translationStatus || 'NONE'
  );

  // Bilingual display state
  type DisplayLang = 'zh' | 'en';
  const sourceLanguage = (currentProblem.sourceLanguage as DisplayLang) || 'zh';
  const targetLanguage = sourceLanguage === 'zh' ? 'en' : 'zh';

  // Show both tabs if: both languages have content OR translation is pending
  const hasBothLanguages = Boolean(currentProblem.titleZh && currentProblem.titleEn);
  const showBothTabs = hasBothLanguages || translationStatus === 'PENDING';

  const [displayLang, setDisplayLang] = useState<DisplayLang>(sourceLanguage);

  // Check if selected language content is available
  const isTargetLanguageSelected = displayLang === targetLanguage;
  const isTranslating = translationStatus === 'PENDING' && isTargetLanguageSelected;
  const hasTargetContent = targetLanguage === 'en'
    ? Boolean(currentProblem.titleEn && currentProblem.descriptionEn)
    : Boolean(currentProblem.titleZh && currentProblem.descriptionZh);

  // Get content based on display language
  const getDisplayTitle = () => displayLang === 'en' && currentProblem.titleEn ? currentProblem.titleEn : (currentProblem.titleZh || currentProblem.title);
  const getDisplayDescription = () => displayLang === 'en' && currentProblem.descriptionEn ? currentProblem.descriptionEn : (currentProblem.descriptionZh || currentProblem.description);
  const getDisplayInput = () => displayLang === 'en' && currentProblem.inputEn ? currentProblem.inputEn : (currentProblem.inputZh || currentProblem.input);
  const getDisplayOutput = () => displayLang === 'en' && currentProblem.outputEn ? currentProblem.outputEn : (currentProblem.outputZh || currentProblem.output);
  const getDisplayHint = () => displayLang === 'en' && currentProblem.hintEn ? currentProblem.hintEn : (currentProblem.hintZh || currentProblem.hint);
  const getDisplayTags = () => displayLang === 'en' && currentProblem.tagsEn?.length ? currentProblem.tagsEn : (currentProblem.tagsZh?.length ? currentProblem.tagsZh : currentProblem.tags);

  // Code state
  const [language, setLanguage] = useState<ProgrammingLanguage | 'AUTO'>('AUTO');
  const [source, setSource] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [testResult, setTestResult] = useState<CodeTestResponse | null>(null);
  const hasDetectedLanguage = useRef(false);

  // Pipeline config
  const [submissionType, setSubmissionType] = useState<SubmissionType>('SINGLE_FILE');
  const [loadingConfig, setLoadingConfig] = useState(true);

  const isMultiFileMode = submissionType === 'MULTI_FILE';
  const isCustomInputRun = customInput.length > 0;

  // Status badge color helper
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

  // Render test result icon
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
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6" />
        <path d="M9 9l6 6" />
      </svg>
    );

  // Render output UI component
  const renderOutputContent = () => {
    if (testing) {
      return (
        <div className="flex items-center justify-center p-4 text-gray-500">
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Running tests...
        </div>
      );
    }

    if (!testResult) {
      return (
        <div className="flex items-center justify-center p-4 text-gray-400 text-sm">
          Click "Run" to test your code
        </div>
      );
    }

    // Compile error
    if (testResult.compileStatus === 'CE') {
      return (
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {messages.testResultCompileError}
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-900 p-2 text-xs text-gray-100">
            {testResult.compileLog}
          </pre>
        </div>
      );
    }

    // Test results
    return (
      <div className="space-y-2 p-2">
        {testResult.results.map((result, index) => (
          <div
            key={index}
            className="rounded-md border border-gray-200 bg-white p-2"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-900">
                {result.name}
              </span>
              <div className="flex items-center gap-1.5">
                {result.timeMs !== undefined && (
                  <span className="text-xs text-gray-500">
                    {result.timeMs}ms
                  </span>
                )}
                {!isCustomInputRun && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(result.status)}`}
                  >
                    {result.status === 'RUNNING' ? 'AC' : result.status}
                  </span>
                )}
                {!isCustomInputRun && result.passed !== undefined && (
                  renderTestResultIcon(result.passed)
                )}
              </div>
            </div>

            {result.stdout && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-gray-600">
                  {messages.testResultOutput}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-1.5 text-xs text-gray-900">
                  {result.stdout}
                </pre>
              </div>
            )}

            {result.stderr && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-gray-600">
                  {messages.testResultError}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-red-50 p-1.5 text-xs text-red-900">
                  {result.stderr}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Hide footer when in IDE mode
  useEffect(() => {
    document.body.classList.add('hide-footer');
    return () => {
      document.body.classList.remove('hide-footer');
    };
  }, []);

  // Auto-expand Output on mobile when test result arrives
  useEffect(() => {
    if (isMobile && testResult) {
      setMobileOutputExpanded(true);
    }
  }, [isMobile, testResult]);

  // Load pipeline config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getPipelineConfig(problem.displayId, accessToken);
        if (config.submissionType) {
          setSubmissionType(config.submissionType);
        }
      } catch (err) {
        console.error('Failed to load pipeline config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, [problem.displayId, accessToken]);

  // Poll translation status when PENDING
  useEffect(() => {
    if (translationStatus !== 'PENDING' || !accessToken) return;

    const pollInterval = setInterval(async () => {
      try {
        const statusResult = await getTranslationStatus(currentProblem.displayId, accessToken);
        setTranslationStatus(statusResult.status);

        // If translation completed, fetch updated problem data
        if (statusResult.status === 'COMPLETED') {
          const updatedProblem = await getProblem(currentProblem.displayId, accessToken);
          setCurrentProblem(updatedProblem);
        }
      } catch (err) {
        console.error('Failed to poll translation status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [translationStatus, currentProblem.displayId, accessToken]);

  // Auto-detect language
  const detectLanguage = useCallback((code: string): ProgrammingLanguage | null => {
    if (!code.trim()) return null;

    if (
      /^\s*import\s+java\./m.test(code) ||
      /\b(public|private|protected)\s+(class|interface)\s+\w+/.test(code) ||
      /public\s+static\s+void\s+main\s*\(/.test(code) ||
      /^\s*package\s+[\w.]+\s*;/m.test(code)
    ) {
      return 'JAVA';
    }

    if (
      /#include\s*<(iostream|vector|algorithm|string|map|set|queue|stack|cmath|bits\/stdc\+\+\.h)>/.test(code) ||
      /\b(cout|cin|std::)\b/.test(code) ||
      /using\s+namespace\s+std/.test(code)
    ) {
      return 'CPP';
    }

    if (
      /#include\s*<(stdio\.h|stdlib\.h|string\.h|math\.h)>/.test(code) ||
      /\b(printf|scanf)\s*\(/.test(code)
    ) {
      return 'C';
    }

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
  }, []);

  useEffect(() => {
    if (language === 'AUTO' && !hasDetectedLanguage.current && source.trim()) {
      const detected = detectLanguage(source);
      if (detected && problem.allowedLanguages.includes(detected)) {
        setLanguage(detected);
        hasDetectedLanguage.current = true;
      }
    }
  }, [source, language, problem.allowedLanguages, detectLanguage]);

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

  const getDifficultyBadge = (diff: ProblemDifficulty) => {
    const styles: Record<ProblemDifficulty, string> = {
      UNKNOWN: 'bg-gray-100 text-gray-700',
      EASY: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HARD: 'bg-red-100 text-red-700',
    };
    const labels: Record<ProblemDifficulty, string> = {
      UNKNOWN: messages.problemsDifficultyUnknown,
      EASY: messages.problemsDifficultyEasy,
      MEDIUM: messages.problemsDifficultyMedium,
      HARD: messages.problemsDifficultyHard,
    };
    return (
      <span className={`rounded-md px-2 py-1 text-xs font-medium ${styles[diff]}`}>
        {labels[diff]}
      </span>
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!user) {
      setError(messages.coursesLoginRequired);
      return;
    }

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
        result = await createSubmissionWithZip(
          problem.displayId,
          zipFile,
          {
            language: language as ProgrammingLanguage,
            courseId,
            homeworkId,
          },
          accessToken,
        );
      } else {
        result = await createSubmission(
          problem.displayId,
          {
            language: language as ProgrammingLanguage,
            source,
            courseId,
            homeworkId,
          },
          accessToken,
        );
      }

      router.push(`/submissions/${result.submissionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorData = (err as Error & { data?: Record<string, unknown> }).data;

      // Handle CODE_BLOCKED error specially
      if (errorData?.error === 'CODE_BLOCKED') {
        const reason = errorData.reason as string || 'Malicious code detected';
        setError(`Code blocked: ${reason}`);
      } else {
        const errorMap: Record<string, string> = {
          SUBMISSION_QUOTA_EXCEEDED: messages.submissionErrorQuotaExceeded,
          SUBMISSION_LANGUAGE_NOT_ALLOWED: messages.submissionErrorLanguageNotAllowed,
          HOMEWORK_NOT_STARTED: messages.submissionErrorHomeworkNotStarted,
          HOMEWORK_ENDED: messages.submissionErrorHomeworkEnded,
          NOT_COURSE_MEMBER: messages.submissionErrorNotCourseMember,
          PERMISSION_DENIED: messages.submissionErrorPermissionDenied,
        };
        setError(errorMap[errorMessage] || errorMessage);
      }
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
      const customInputValue = customInput.length > 0 ? customInput : undefined;
      const result = await testCode(
        problem.displayId,
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
      const errorData = (err as Error & { data?: Record<string, unknown> }).data;

      // Handle CODE_BLOCKED error specially
      if (errorData?.error === 'CODE_BLOCKED') {
        const reason = errorData.reason as string || 'Malicious code detected';
        setTestError(`Code blocked: ${reason}`);
      } else {
        setTestError(errorMessage);
      }
    } finally {
      setTesting(false);
    }
  };


  if (authLoading || loadingConfig) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Loading spinner component for translation
  const TranslatingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <svg className="h-8 w-8 animate-spin text-[#003865]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="mt-3 text-sm text-gray-600">{messages.problemTranslationPending || '正在翻譯中...'}</p>
    </div>
  );

  // Shared problem content component
  const problemContent = (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Language Switch Tab (show when both languages exist OR translation is pending) */}
      {showBothTabs && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayLang('zh')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              displayLang === 'zh'
                ? 'bg-[#003865] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setDisplayLang('en')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              displayLang === 'en'
                ? 'bg-[#003865] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            English
          </button>
          {translationStatus === 'PENDING' && (
            <span className="ml-2 flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {messages.problemTranslationPending || '翻譯中...'}
            </span>
          )}
        </div>
      )}

      {/* Show loading spinner if translating and target language selected without content */}
      {isTranslating && !hasTargetContent ? (
        <TranslatingSpinner />
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-base font-semibold text-gray-900">
              {messages.problemDescription}
            </h2>
            <MarkdownRenderer content={getDisplayDescription()} />
          </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-gray-900">
          {messages.problemInput}
        </h2>
        <MarkdownRenderer content={getDisplayInput()} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-gray-900">
          {messages.problemOutput}
        </h2>
        <MarkdownRenderer content={getDisplayOutput()} />
      </section>

      {getDisplayHint() && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold text-gray-900">
            {messages.problemHint}
          </h2>
          <MarkdownRenderer content={getDisplayHint()!} />
        </section>
      )}

      {problem.sampleCases.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            {messages.problemSampleIO}
          </h2>
          <div className="space-y-4">
            {problem.sampleCases.map((sample, idx) => (
              <div key={idx} className="space-y-2">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">
                    {messages.problemSampleInput} #{idx + 1}
                  </h3>
                  <pre className="overflow-x-auto rounded-md bg-gray-100 p-3 text-sm">
                    {sample.input}
                  </pre>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">
                    {messages.problemSampleOutput} #{idx + 1}
                  </h3>
                  <pre className="overflow-x-auto rounded-md bg-gray-100 p-3 text-sm">
                    {sample.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {getDisplayTags() && getDisplayTags()!.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">
            {messages.problemsTableTags}
          </h2>
          <div className="flex flex-wrap gap-2">
            {getDisplayTags()!.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-[#003865] px-3 py-1 text-xs text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-100">
        {/* Mobile Tab Bar */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setMobileTab('problem')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'problem'
                ? 'border-b-2 border-[#003865] text-[#003865]'
                : 'text-gray-600'
            }`}
          >
            {messages.problemDescription}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'editor'
                ? 'border-b-2 border-[#003865] text-[#003865]'
                : 'text-gray-600'
            }`}
          >
            {messages.submissionCode}
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {mobileTab === 'problem' ? (
            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              {/* Problem Header */}
              <div className="border-b border-gray-200 px-4 py-3">
                <div className="mb-2">
                  <Link
                    href={courseSlug ? `/courses/${courseSlug}/problems` : '/problems'}
                    className="text-sm text-[#003865] hover:underline"
                  >
                    &larr; {messages.problemBackToList}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#003865]">
                    [{problem.displayId}]
                  </span>
                  <h1 className="text-lg font-bold text-gray-900 truncate">
                    {getDisplayTitle()}
                  </h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {getDifficultyBadge(problem.difficulty)}
                </div>
              </div>
              {problemContent}
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              {/* Language Selector */}
              <div className="border-b border-gray-200 px-4 py-2">
                <select
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value as ProgrammingLanguage | 'AUTO';
                    setLanguage(newLang);
                    if (newLang !== 'AUTO') {
                      hasDetectedLanguage.current = true;
                    } else {
                      hasDetectedLanguage.current = false;
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                >
                  <option value="AUTO">{getLanguageLabel('AUTO')}</option>
                  {problem.allowedLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {getLanguageLabel(lang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error/Warning Messages */}
              {(error || testError) && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2">
                  <p className="text-sm text-red-700">{error || testError}</p>
                </div>
              )}
              {!user && (
                <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2">
                  <p className="text-sm text-yellow-700">{messages.coursesLoginRequired}</p>
                </div>
              )}

              {/* Code Editor */}
              <div className="min-h-[200px] flex-1">
                {isMultiFileMode ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <ZipUploader
                      file={zipFile}
                      onFileChange={setZipFile}
                      maxSizeMb={10}
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <CodeEditor
                    value={source}
                    onChange={setSource}
                    language={language}
                    height="100%"
                    className="h-full rounded-none border-0"
                  />
                )}
              </div>

              {/* Input/Output for Mobile - Collapsible */}
              {!isMultiFileMode && (
                <div className="flex flex-col border-t border-gray-200">
                  {/* Input - Collapsible */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileInputExpanded(!mobileInputExpanded)}
                      className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-gray-600">Input</span>
                      <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${mobileInputExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {mobileInputExpanded && (
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder={messages.testCustomInputPlaceholder}
                        rows={4}
                        className="resize-none border-0 bg-gray-900 p-3 font-mono text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
                      />
                    )}
                  </div>
                  {/* Output - Collapsible */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileOutputExpanded(!mobileOutputExpanded)}
                      className="flex items-center justify-between border-b border-t border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-gray-600">Output</span>
                      <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${mobileOutputExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {mobileOutputExpanded && (
                      <div className="max-h-60 overflow-auto bg-gray-100">
                        {renderOutputContent()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Toolbar */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          {!isMultiFileMode && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !source.trim() || !user}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Run'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (isMultiFileMode ? !zipFile : !source.trim()) || !user}
            className={`flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${isMultiFileMode ? 'ml-auto' : ''}`}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Problem Description */}
        <Panel defaultSize={50} minSize={25} maxSize={70}>
          <div className="flex h-full flex-col overflow-hidden bg-white">
            {/* Problem Header */}
            <div className="border-b border-gray-200 px-4 py-3">
              {/* Back link */}
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Link
                  href={courseSlug ? `/courses/${courseSlug}/problems` : '/problems'}
                  className="text-[#003865] hover:underline"
                >
                  &larr; {messages.problemBackToList}
                </Link>
                {courseName && (
                  <span className="text-gray-500">| {courseName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-[#003865]">
                  [{problem.displayId}]
                </span>
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {getDisplayTitle()}
                </h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {getDifficultyBadge(problem.difficulty)}
                {problem.allowedLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {getLanguageLabel(lang)}
                  </span>
                ))}
              </div>
            </div>

            {problemContent}
          </div>
        </Panel>

        {/* Resize Handle - Horizontal */}
        <PanelResizeHandle className="w-2 bg-gray-300 transition-colors hover:bg-blue-400 active:bg-blue-500" />

        {/* Right Panel - Code Editor */}
        <Panel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <div className="flex items-center gap-3">
                <select
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value as ProgrammingLanguage | 'AUTO';
                    setLanguage(newLang);
                    if (newLang !== 'AUTO') {
                      hasDetectedLanguage.current = true;
                    } else {
                      hasDetectedLanguage.current = false;
                    }
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                >
                  <option value="AUTO">{getLanguageLabel('AUTO')}</option>
                  {problem.allowedLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {getLanguageLabel(lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {!isMultiFileMode && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !source.trim() || !user}
                    className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {testing ? 'Testing...' : 'Run'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || (isMultiFileMode ? !zipFile : !source.trim()) || !user}
                  className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(error || testError) && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2">
                <p className="text-sm text-red-700">{error || testError}</p>
              </div>
            )}

            {/* Not logged in warning */}
            {!user && (
              <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2">
                <p className="text-sm text-yellow-700">{messages.coursesLoginRequired}</p>
              </div>
            )}

            {/* Code Editor and I/O Panel */}
            <PanelGroup direction="vertical" className="min-h-0 flex-1">
              {/* Code Editor */}
              <Panel defaultSize={70} minSize={30}>
                {isMultiFileMode ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <div className="w-full max-w-md">
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
                  </div>
                ) : (
                  <CodeEditor
                    value={source}
                    onChange={setSource}
                    language={language}
                    height="100%"
                    className="h-full rounded-none border-0"
                  />
                )}
              </Panel>

              {/* Resize Handle - Vertical */}
              {!isMultiFileMode && (
                <PanelResizeHandle className="h-2 bg-gray-300 transition-colors hover:bg-blue-400 active:bg-blue-500" />
              )}

              {/* Input/Output Panel */}
              {!isMultiFileMode && (
                <Panel
                  defaultSize={30}
                  minSize={15}
                  maxSize={60}
                  collapsible
                >
                  <PanelGroup direction="horizontal" className="h-full">
                    {/* Input Panel */}
                    <Panel defaultSize={50} minSize={20}>
                      <div className="flex h-full flex-col border-t border-gray-200">
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                          <span className="text-xs font-medium text-gray-600">Input</span>
                        </div>
                        <textarea
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder={messages.testCustomInputPlaceholder}
                          className="flex-1 resize-none border-0 bg-gray-900 p-3 font-mono text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                        />
                      </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-gray-300 transition-colors hover:bg-blue-400 active:bg-blue-500" />

                    {/* Output Panel */}
                    <Panel defaultSize={50} minSize={20}>
                      <div className="flex h-full flex-col border-t border-gray-200">
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                          <span className="text-xs font-medium text-gray-600">Output</span>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100">
                          {renderOutputContent()}
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>
              )}
            </PanelGroup>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
