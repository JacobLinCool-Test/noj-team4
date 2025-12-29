'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getProblem,
  submitCode,
  submitZip,
  type ProblemDetail,
  type ProgrammingLanguage,
  type ApiError,
} from '@/lib/api';
import { CodeEditor } from '@/components/CodeEditor';
import { ZipUploader } from '@/components/ZipUploader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Language configuration using NOJ format
const ALL_LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'C', label: 'C' },
  { value: 'CPP', label: 'C++' },
  { value: 'PYTHON', label: 'Python 3' },
  { value: 'JAVA', label: 'Java' },
];

// Monaco language mapping
const MONACO_LANG_MAP: Record<ProgrammingLanguage, string> = {
  C: 'c',
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'python',
};

const DEFAULT_CODE: Record<ProgrammingLanguage, string> = {
  C: '#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}\n',
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}\n',
  PYTHON: '# Your code here\n',
  JAVA: 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n',
};

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<ProgrammingLanguage>('CPP');
  const [code, setCode] = useState(DEFAULT_CODE.CPP);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter languages based on problem's allowedLanguages
  const availableLanguages = useMemo(() => {
    if (!problem?.allowedLanguages?.length) {
      return ALL_LANGUAGES;
    }
    return ALL_LANGUAGES.filter((lang) =>
      problem.allowedLanguages.includes(lang.value)
    );
  }, [problem?.allowedLanguages]);

  // Update language if current selection is not allowed
  useEffect(() => {
    if (
      availableLanguages.length > 0 &&
      !availableLanguages.some((lang) => lang.value === language)
    ) {
      const newLang = availableLanguages[0].value;
      setLanguage(newLang);
      setCode(DEFAULT_CODE[newLang] || '');
    }
  }, [availableLanguages, language]);

  useEffect(() => {
    async function fetchProblem() {
      try {
        const data = await getProblem(problemId);
        setProblem(data.problem);
      } catch (err) {
        setError((err as Error).message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    }

    fetchProblem();
  }, [problemId]);

  const handleLanguageChange = (newLang: ProgrammingLanguage) => {
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang] || '');
  };

  const handleSubmit = async () => {
    const isMultiFile = problem?.submissionType === 'MULTI_FILE';

    if (isMultiFile) {
      if (!zipFile) {
        setSubmitError('請上傳 ZIP 檔案');
        return;
      }
    } else {
      if (!code.trim()) {
        setSubmitError('請輸入程式碼');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let submission;
      if (isMultiFile) {
        const result = await submitZip(problemId, zipFile!, language);
        submission = result.submission;
      } else {
        const result = await submitCode(problemId, code, language);
        submission = result.submission;
      }
      router.push(`/submissions/${submission.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      setSubmitError(apiError.message || '提交失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        {error || '題目不存在'}
      </div>
    );
  }

  const isMultiFile = problem.submissionType === 'MULTI_FILE';
  const isFunctionOnly = problem.submissionType === 'FUNCTION_ONLY';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
          {(isMultiFile || isFunctionOnly) && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                isMultiFile
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isMultiFile ? '多檔案專案' : '函式填空'}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {problem.displayId}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Problem Description */}
        <div className="bg-white rounded-lg shadow p-6 overflow-auto max-h-[calc(100vh-200px)]">
          <div className="prose prose-sm max-w-none markdown-content">
            <h3>題目描述</h3>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {problem.description}
            </ReactMarkdown>

            {problem.input && (
              <>
                <h3>輸入格式</h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {problem.input}
                </ReactMarkdown>
              </>
            )}

            {problem.output && (
              <>
                <h3>輸出格式</h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {problem.output}
                </ReactMarkdown>
              </>
            )}

            {problem.sampleInputs && problem.sampleInputs.length > 0 && (
              <>
                <h3>範例</h3>
                {problem.sampleInputs.map((sampleInput, index) => (
                  <div key={index} className="mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          輸入 #{index + 1}
                        </div>
                        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                          {sampleInput}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          輸出 #{index + 1}
                        </div>
                        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                          {problem.sampleOutputs[index] || ''}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {problem.hint && (
              <>
                <h3>提示</h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {problem.hint}
                </ReactMarkdown>
              </>
            )}
          </div>
        </div>

        {/* Right: Submission Area */}
        <div className="space-y-4">
          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as ProgrammingLanguage)
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          {/* Submission Input: CodeEditor or ZipUploader based on type */}
          {isMultiFile ? (
            <div className="bg-white rounded-lg shadow p-6">
              <ZipUploader
                onFileSelect={setZipFile}
                disabled={submitting}
              />
            </div>
          ) : (
            <>
              {isFunctionOnly && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  <strong>函式填空模式：</strong>請只填寫函式內容，系統會自動將您的程式碼與模板合併。
                </div>
              )}
              <CodeEditor
                value={code}
                onChange={setCode}
                language={MONACO_LANG_MAP[language]}
                height="calc(100vh - 320px)"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
