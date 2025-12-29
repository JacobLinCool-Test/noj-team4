'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n/useI18n';
import * as api from '@/lib/api/ai-problem-creator';
import { ProblemEditor } from '@/components/ai-problem-creator/ProblemEditor';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

type GenerationState = 'idle' | 'generating' | 'ready' | 'publishing' | 'published' | 'error' | 'cooldown';
type ModalView = 'preview' | 'edit';

// localStorage keys for tracking generation state
const LS_KEY_GEN_SESSION = 'noj_ai_gen_session'; // { sessionId, startedAt, prompt }
const LS_KEY_GEN_COOLDOWN = 'noj_ai_gen_cooldown_until';
const GENERATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes - max time a generation can take
const COOLDOWN_AFTER_COMPLETE_MS = 10 * 1000; // 10 seconds cooldown after completion

interface StoredSession {
  sessionId: string;
  startedAt: number;
  prompt: string;
}

export function HeroSection() {
  const { user, accessToken } = useAuth();
  const { messages } = useI18n();
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationProgress, setGenerationProgress] = useState('');
  const [problemData, setProblemData] = useState<api.GeneratedProblem | null>(null);
  const [solutionData, setSolutionData] = useState<api.GeneratedSolution | null>(null);
  const [testdataKey, setTestdataKey] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<api.TestCaseResult[]>([]);
  const [publishedProblem, setPublishedProblem] = useState<api.PublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [autoTranslate, setAutoTranslate] = useState(true); // Default to true

  const isLoggedIn = !!user;

  // Check localStorage on mount to detect ongoing/recent generation and try to restore
  useEffect(() => {
    const checkAndRestoreSession = async () => {
      const storedSessionStr = localStorage.getItem(LS_KEY_GEN_SESSION);
      const cooldownUntil = localStorage.getItem(LS_KEY_GEN_COOLDOWN);
      const now = Date.now();

      // Check if there's a cooldown period first
      if (cooldownUntil) {
        const cooldownTime = parseInt(cooldownUntil, 10);
        if (now < cooldownTime) {
          setGenerationState('cooldown');
          const remaining = Math.ceil((cooldownTime - now) / 1000);
          setCooldownRemaining(remaining);
          return;
        } else {
          localStorage.removeItem(LS_KEY_GEN_COOLDOWN);
        }
      }

      // Check if there's an active session to restore
      if (storedSessionStr && accessToken) {
        try {
          const storedSession: StoredSession = JSON.parse(storedSessionStr);
          const elapsed = now - storedSession.startedAt;

          // If session is too old (>2 min), it timed out - clean up and return to idle
          if (elapsed >= GENERATION_TIMEOUT_MS) {
            localStorage.removeItem(LS_KEY_GEN_SESSION);
            return;
          }

          // Try to restore the session by fetching its data
          setGenerationState('generating');
          setGenerationProgress(messages.aiProblemCreatorRestoringProgress);
          setInputValue(storedSession.prompt);

          const sessionData = await api.getSessionProblemData(storedSession.sessionId, accessToken);

          if (sessionData.problemData) {
            // Session has completed - show the result
            setProblemData(sessionData.problemData);
            if (sessionData.solutionData) {
              setSolutionData(sessionData.solutionData);
            }

            // Generate testdata if we have solution
            if (sessionData.problemData && sessionData.solutionData) {
              setGenerationProgress(messages.aiProblemCreatorGeneratingTestdata);
              const testInputs = sessionData.problemData.suggestedTestInputs || [];
              if (testInputs.length > 0) {
                const testResult = await api.generateTestdata(
                  storedSession.sessionId,
                  sessionData.solutionData.code,
                  sessionData.solutionData.language,
                  testInputs,
                  accessToken,
                );
                if (testResult.success) {
                  setTestCases(testResult.testCases);
                  setTestdataKey(testResult.testdataKey || null);
                }
              }
            }

            markGenerationComplete();
            setGenerationState('ready');
          } else {
            // Session exists but no problem data yet - keep polling
            const remainingTime = GENERATION_TIMEOUT_MS - elapsed;
            setGenerationProgress(messages.aiProblemCreatorAiGenerating);

            // Poll for completion
            const pollInterval = setInterval(async () => {
              try {
                const pollData = await api.getSessionProblemData(storedSession.sessionId, accessToken);
                if (pollData.problemData) {
                  clearInterval(pollInterval);
                  setProblemData(pollData.problemData);
                  if (pollData.solutionData) {
                    setSolutionData(pollData.solutionData);
                  }

                  // Generate testdata
                  if (pollData.problemData && pollData.solutionData) {
                    setGenerationProgress(messages.aiProblemCreatorGeneratingTestdata);
                    const testInputs = pollData.problemData.suggestedTestInputs || [];
                    if (testInputs.length > 0) {
                      const testResult = await api.generateTestdata(
                        storedSession.sessionId,
                        pollData.solutionData.code,
                        pollData.solutionData.language,
                        testInputs,
                        accessToken,
                      );
                      if (testResult.success) {
                        setTestCases(testResult.testCases);
                        setTestdataKey(testResult.testdataKey || null);
                      }
                    }
                  }

                  markGenerationComplete();
                  setGenerationState('ready');
                }
              } catch {
                // Ignore polling errors
              }
            }, 3000);

            // Auto-cancel after remaining time
            setTimeout(() => {
              clearInterval(pollInterval);
              const currentState = localStorage.getItem(LS_KEY_GEN_SESSION);
              if (currentState) {
                // Still waiting - timeout
                localStorage.removeItem(LS_KEY_GEN_SESSION);
                setError(messages.aiProblemCreatorTimeout);
                setGenerationState('error');
              }
            }, remainingTime);
          }
        } catch {
          // Failed to restore - clean up
          localStorage.removeItem(LS_KEY_GEN_SESSION);
          setGenerationState('idle');
        }
      }
    };

    checkAndRestoreSession();
  }, [accessToken]);

  // Countdown timer for cooldown
  useEffect(() => {
    if (generationState !== 'cooldown' || cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          // Cooldown complete
          localStorage.removeItem(LS_KEY_GEN_SESSION);
          localStorage.removeItem(LS_KEY_GEN_COOLDOWN);
          setGenerationState('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [generationState, cooldownRemaining]);

  // Helper to mark generation start in localStorage with session info
  const markGenerationStart = (sessionId: string, prompt: string) => {
    const session: StoredSession = {
      sessionId,
      startedAt: Date.now(),
      prompt,
    };
    localStorage.setItem(LS_KEY_GEN_SESSION, JSON.stringify(session));
    localStorage.removeItem(LS_KEY_GEN_COOLDOWN);
  };

  // Helper to mark generation complete and set cooldown
  const markGenerationComplete = () => {
    localStorage.removeItem(LS_KEY_GEN_SESSION);
    localStorage.setItem(LS_KEY_GEN_COOLDOWN, (Date.now() + COOLDOWN_AFTER_COMPLETE_MS).toString());
  };

  // Helper to clear all generation tracking
  const clearGenerationTracking = () => {
    localStorage.removeItem(LS_KEY_GEN_SESSION);
    localStorage.removeItem(LS_KEY_GEN_COOLDOWN);
  };

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;

    if (!isLoggedIn) {
      setShowLoginMessage(true);
      setTimeout(() => setShowLoginMessage(false), 3000);
      return;
    }

    // Check if in cooldown or generating (state-based check)
    if (generationState === 'cooldown' || generationState === 'generating') {
      return;
    }

    // Double-check localStorage directly (safety measure against state sync issues)
    const storedSessionStr = localStorage.getItem(LS_KEY_GEN_SESSION);
    const cooldownUntil = localStorage.getItem(LS_KEY_GEN_COOLDOWN);
    const now = Date.now();

    if (storedSessionStr) {
      try {
        const storedSession: StoredSession = JSON.parse(storedSessionStr);
        if (now - storedSession.startedAt < GENERATION_TIMEOUT_MS) {
          // Still within generation timeout - don't allow new generation
          return;
        }
      } catch {
        // Invalid JSON, clean up
        localStorage.removeItem(LS_KEY_GEN_SESSION);
      }
    }

    if (cooldownUntil) {
      const cooldownTime = parseInt(cooldownUntil, 10);
      if (now < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - now) / 1000);
        setCooldownRemaining(remaining);
        setGenerationState('cooldown');
        return;
      }
    }

    // Start generation
    setGenerationState('generating');
    setGenerationProgress(messages.aiProblemCreatorStartingAi);
    setError(null);
    setProblemData(null);
    setSolutionData(null);
    setTestdataKey(null);
    setTestCases([]);

    try {
      // 1. Start session
      const session = await api.startSession(accessToken);

      // Mark generation start with session info (for recovery on reload)
      markGenerationStart(session.sessionId, inputValue);

      setGenerationProgress(messages.aiProblemCreatorAnalyzing);

      // 2. Send the message and stream response
      // Use 'direct' mode for homepage - generate problem immediately without conversation
      const response = await api.chatStream(session.sessionId, inputValue, accessToken, 'direct');

      let fullResponse = '';
      let receivedProblem: api.GeneratedProblem | null = null;
      let receivedSolution: api.GeneratedSolution | null = null;

      for await (const event of api.parseSSEStream(response)) {
        if (event.type === 'chunk') {
          const chunk = event.data as { text: string };
          fullResponse += chunk.text;
          // Update progress based on content length
          if (fullResponse.length < 200) {
            setGenerationProgress(messages.aiProblemCreatorUnderstanding);
          } else if (fullResponse.length < 500) {
            setGenerationProgress(messages.aiProblemCreatorDesigning);
          } else {
            setGenerationProgress(messages.aiProblemCreatorGeneratingSolution);
          }
        } else if (event.type === 'problem_ready') {
          const data = event.data as {
            problemData?: api.GeneratedProblem;
            solutionData?: api.GeneratedSolution;
          };
          if (data.problemData) {
            receivedProblem = data.problemData;
            setProblemData(data.problemData);
          }
          if (data.solutionData) {
            receivedSolution = data.solutionData;
            setSolutionData(data.solutionData);
          }
        } else if (event.type === 'error') {
          const errorData = event.data as { error: string };
          throw new Error(errorData.error);
        }
      }

      // 3. If we didn't receive problem_ready event, fetch from session
      if (!receivedProblem) {
        setGenerationProgress(messages.aiProblemCreatorGettingResult);
        const sessionData = await api.getSessionProblemData(session.sessionId, accessToken);
        if (sessionData.problemData) {
          receivedProblem = sessionData.problemData;
          setProblemData(sessionData.problemData);
        }
        if (sessionData.solutionData) {
          receivedSolution = sessionData.solutionData;
          setSolutionData(sessionData.solutionData);
        }
      }

      // 4. Generate testdata if we have problem and solution
      if (receivedProblem && receivedSolution) {
        setGenerationProgress(messages.aiProblemCreatorGeneratingTestdata);

        const testInputs = receivedProblem.suggestedTestInputs || [];
        if (testInputs.length > 0) {
          const testResult = await api.generateTestdata(
            session.sessionId,
            receivedSolution.code,
            receivedSolution.language,
            testInputs,
            accessToken,
          );

          if (testResult.success) {
            setTestCases(testResult.testCases);
            setTestdataKey(testResult.testdataKey || null);
          }
        }

        // Mark generation complete and set cooldown
        markGenerationComplete();
        setGenerationState('ready');
      } else {
        throw new Error(messages.aiProblemCreatorAiCannotGenerate);
      }
    } catch (err) {
      // Mark generation complete even on error (set cooldown to prevent spam)
      markGenerationComplete();
      setError(err instanceof Error ? err.message : messages.aiProblemCreatorGenerationFailed);
      setGenerationState('error');
    }
  }, [inputValue, isLoggedIn, accessToken, generationState, messages]);

  const handlePublish = async () => {
    if (!problemData) return;

    setGenerationState('publishing');
    setError(null);

    try {
      const result = await api.publishProblem(
        {
          title: problemData.title,
          description: problemData.description,
          inputFormat: problemData.inputFormat,
          outputFormat: problemData.outputFormat,
          sampleCases: problemData.sampleCases,
          difficulty: problemData.difficulty,
          tags: problemData.tags,
          timeLimitMs: problemData.constraints.timeLimitMs,
          memoryLimitKb: problemData.constraints.memoryLimitKb,
          testdataKey: testdataKey || undefined,
          autoTranslate,
        },
        accessToken,
      );

      setPublishedProblem(result);
      setGenerationState('published');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
      setGenerationState('ready');
    }
  };

  const handleReset = () => {
    // Clear UI state
    setGenerationProgress('');
    setProblemData(null);
    setSolutionData(null);
    setTestdataKey(null);
    setTestCases([]);
    setPublishedProblem(null);
    setError(null);
    setInputValue('');

    // Check if there's still a cooldown in effect
    const cooldownUntil = localStorage.getItem(LS_KEY_GEN_COOLDOWN);
    const now = Date.now();
    if (cooldownUntil) {
      const cooldownTime = parseInt(cooldownUntil, 10);
      if (now < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - now) / 1000);
        setCooldownRemaining(remaining);
        setGenerationState('cooldown');
        return;
      } else {
        localStorage.removeItem(LS_KEY_GEN_COOLDOWN);
      }
    }

    setCooldownRemaining(0);
    setGenerationState('idle');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Enter from submitting - user must click the button
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const placeholderExamples = [
    '設計一個計算費波那契數列的題目...',
    'Create a problem about binary search...',
    '設計一個關於圖形遍歷的題目...',
    'A problem that requires dynamic programming...',
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<ModalView>('preview');

  // Open modal when generation is ready
  useEffect(() => {
    if (generationState === 'ready' && problemData) {
      setShowModal(true);
      setModalView('preview');
    }
  }, [generationState, problemData]);

  const handleCloseModal = () => {
    setShowModal(false);
    setModalView('preview');
    handleReset();
  };

  const handleSaveEdit = (editedProblem: api.GeneratedProblem) => {
    setProblemData(editedProblem);
    setModalView('preview');
  };

  // Render the preview modal
  const renderModal = () => {
    if (!showModal || !problemData) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl mx-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[#003865] to-[#1e5d8f] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {modalView === 'edit' ? messages.aiProblemCreatorEditProblem : messages.aiProblemCreatorAiCompleted}
                </h2>
                <p className="text-sm text-white/70">
                  {modalView === 'edit' && messages.aiProblemCreatorEditContent}
                  {modalView === 'preview' && generationState === 'ready' && messages.aiProblemCreatorPreviewAndPublish}
                  {generationState === 'publishing' && messages.aiProblemCreatorPublishing}
                  {generationState === 'published' && messages.aiProblemCreatorPublishSuccess}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              disabled={generationState === 'publishing'}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {modalView === 'edit' ? (
              <ProblemEditor
                problem={problemData}
                onSave={handleSaveEdit}
                onCancel={() => setModalView('preview')}
              />
            ) : generationState === 'publishing' ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-[#003865] border-t-transparent" />
                  <p className="text-lg text-gray-600">{messages.aiProblemCreatorPublishingProblem}</p>
                </div>
              </div>
            ) : generationState === 'published' && publishedProblem ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{messages.aiProblemCreatorPublishSuccess}</h3>
                  <p className="mt-2 text-gray-600">{publishedProblem.title}</p>
                  <p className="mt-1 text-sm text-gray-500">Problem ID: {publishedProblem.displayId}</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        router.push(`/problems/${publishedProblem.displayId}`);
                        handleCloseModal();
                      }}
                      className="rounded-lg bg-[#003865] px-6 py-2 text-white hover:bg-[#1e5d8f]"
                    >
                      {messages.aiProblemCreatorViewProblem}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      {messages.aiProblemCreatorCreateNew}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Problem Title & Meta */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{problemData.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded text-sm font-medium ${
                      problemData.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                      problemData.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {problemData.difficulty}
                    </span>
                    {problemData.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded text-sm bg-gray-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                    <span className="ml-auto text-sm text-gray-500">
                      {messages.aiProblemCreatorTestCasesCount.replace('{count}', String(testCases.length))} · {messages.aiProblemCreatorSampleCasesCount.replace('{count}', String(problemData.sampleCases.length))}
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{messages.aiProblemCreatorDescription}</h4>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={problemData.description} />
                  </div>
                </div>

                {/* Input/Output Format */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{messages.aiProblemCreatorInputFormat}</h4>
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer content={problemData.inputFormat} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{messages.aiProblemCreatorOutputFormat}</h4>
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer content={problemData.outputFormat} />
                    </div>
                  </div>
                </div>

                {/* Sample Cases */}
                {problemData.sampleCases.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{messages.aiProblemCreatorSampleTestcases}</h4>
                    <div className="space-y-3">
                      {problemData.sampleCases.map((sample, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">{messages.aiProblemCreatorInput} #{idx + 1}</div>
                            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{sample.input}</pre>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">{messages.aiProblemCreatorOutput} #{idx + 1}</div>
                            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{sample.output}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">{messages.aiProblemCreatorConstraints}</h4>
                  <div className="flex gap-6 text-sm text-blue-700">
                    <span>{messages.aiProblemCreatorTimeLimit.replace('{ms}', String(problemData.constraints.timeLimitMs))}</span>
                    <span>{messages.aiProblemCreatorMemoryLimit.replace('{mb}', String(Math.round(problemData.constraints.memoryLimitKb / 1024)))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {generationState === 'ready' && modalView === 'preview' && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              {/* Auto Translate Option */}
              <div className="mb-4 flex items-center justify-center">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={(e) => setAutoTranslate(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#003865]"
                  />
                  <span className="text-sm text-gray-700">
                    {messages.aiProblemCreatorPublishAutoTranslate || 'AI 自動翻譯（中文 ↔ 英文）'}
                  </span>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← {messages.aiProblemCreatorRestart}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalView('edit')}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {messages.aiProblemCreatorEditDetails}
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
                  >
                    {messages.aiProblemCreatorPublishProblem}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render different states
  const renderContent = () => {
    // Cooldown state - shown when user reloads during generation or during post-generation cooldown
    if (generationState === 'cooldown') {
      return (
        <div className="relative mx-auto max-w-2xl animate-fade-in-up">
          <div className="rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{messages.aiProblemCreatorPleaseWait}</h3>
              <p className="text-amber-300/80 mb-4">
                {cooldownRemaining > 60
                  ? messages.aiProblemCreatorCooldownRunning
                  : messages.aiProblemCreatorCooldownAbuse}
              </p>
              <div className="text-3xl font-mono text-white mb-4">
                {Math.floor(cooldownRemaining / 60).toString().padStart(2, '0')}:
                {(cooldownRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-white/50 text-sm">{messages.aiProblemCreatorCooldownEnd}</p>
            </div>
          </div>
        </div>
      );
    }

    if (generationState === 'generating') {
      return (
        <div className="relative mx-auto max-w-2xl animate-fade-in-up">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8">
            <div className="flex flex-col items-center text-center">
              {/* Loading spinner */}
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-white/20 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-white rounded-full animate-spin" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">{messages.aiProblemCreatorAiGenerating}</h3>
              <p className="text-white/70 mb-4">{generationProgress}</p>

              {/* Progress dots */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/50 animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (generationState === 'error') {
      return (
        <div className="relative mx-auto max-w-2xl animate-fade-in-up">
          <div className="rounded-2xl bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{messages.aiProblemCreatorGenerationFailed}</h3>
              <p className="text-red-300/80 mb-6">{error}</p>
              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                {messages.aiProblemCreatorRetry}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default: Input form (also shown when modal is open for ready/publishing/published states)
    return (
      <>
        {/* AI Input Box */}
        <div
          className={`relative mx-auto max-w-2xl animate-fade-in-up transition-all duration-300 ${
            isFocused ? 'scale-[1.02]' : ''
          }`}
          style={{ animationDelay: '0.4s' }}
        >
          {/* Login message toast */}
          {showLoginMessage && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500/90 text-white rounded-lg shadow-lg animate-fade-in-up z-10">
              {messages.aiProblemCreatorLoginRequired}
            </div>
          )}

          <div className={`relative rounded-2xl bg-white/10 backdrop-blur-xl border transition-all duration-300 ${
            isFocused
              ? 'border-white/40 shadow-2xl shadow-blue-500/20'
              : 'border-white/20 hover:border-white/30'
          }`}>
            <div className="p-4">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderExamples[placeholderIndex]}
                className="w-full bg-transparent text-white placeholder:text-white/40 text-lg resize-none outline-none min-h-[60px]"
                rows={2}
              />

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{messages.aiProblemCreatorAiHelpText}</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{messages.aiProblemCreatorStartCreating}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick templates */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              { key: 'math', label: messages.aiProblemCreatorMath },
              { key: 'string', label: messages.aiProblemCreatorString },
              { key: 'dataStructure', label: messages.aiProblemCreatorDataStructure },
              { key: 'algorithm', label: messages.aiProblemCreatorAlgorithm },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setInputValue(messages.aiProblemCreatorPlaceholder.includes('Describe')
                  ? `Design a problem about ${item.label}`
                  : `設計一個關於${item.label}的題目`)}
                className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20 hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#001830] via-[#003865] to-[#1e5d8f]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating code symbols */}
        <div className="absolute top-20 left-20 text-4xl text-white/10 font-mono animate-float">&lt;/&gt;</div>
        <div className="absolute top-40 right-32 text-3xl text-white/10 font-mono animate-float" style={{ animationDelay: '0.5s' }}>{'{ }'}</div>
        <div className="absolute bottom-32 left-1/4 text-3xl text-white/10 font-mono animate-float" style={{ animationDelay: '1s' }}>#include</div>
        <div className="absolute bottom-48 right-1/4 text-3xl text-white/10 font-mono animate-float" style={{ animationDelay: '1.5s' }}>def</div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-4xl px-6 text-center">
        {/* Logo / Brand */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-white">
              NOJ
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100/80 font-light">
            Normal Online Judge
          </p>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-blue-100/70 mb-12 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {messages.homepageTagline}
        </p>

        {/* Dynamic content based on state */}
        {renderContent()}

        {/* Scroll indicator - only show when idle */}
        {generationState === 'idle' && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </section>

    {/* Preview Modal */}
    {renderModal()}
    </>
  );
}
