'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n/useI18n';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api/ai-problem-creator';
import { ChatInterface } from './ChatInterface';
import { ProblemPreview } from './ProblemPreview';
import { ProblemEditor } from './ProblemEditor';
import { TestdataProgress } from './TestdataProgress';
import { PublishConfirmation } from './PublishConfirmation';

type ModalState = 'chat' | 'preview' | 'edit' | 'generating' | 'ready' | 'publishing' | 'published';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  courseSlug?: string;
};

export function AiProblemCreatorModal({ isOpen, onClose, courseSlug }: Props) {
  const { accessToken, user } = useAuth();
  const { messages: t } = useI18n();
  const router = useRouter();
  const isLoggedIn = !!user;

  const [state, setState] = useState<ModalState>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [problemData, setProblemData] = useState<api.GeneratedProblem | null>(null);
  const [solutionData, setSolutionData] = useState<api.GeneratedSolution | null>(null);
  const [testdataKey, setTestdataKey] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<api.TestCaseResult[]>([]);
  const [publishedProblem, setPublishedProblem] = useState<api.PublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true); // Default to true
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const GENERATE_COOLDOWN_MS = 30000; // 30 seconds cooldown

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, lastGenerateTime + GENERATE_COOLDOWN_MS - Date.now());
      setCooldownRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining, lastGenerateTime]);

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && isLoggedIn && !sessionId) {
      initSession();
    }
  }, [isOpen, isLoggedIn]);

  const initSession = async () => {
    try {
      setError(null);
      const response = await api.startSession(accessToken, courseSlug);
      setSessionId(response.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || isStreaming) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setError(null);

      try {
        const response = await api.chatStream(sessionId, message, accessToken);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Parse SSE stream
        for await (const event of api.parseSSEStream(response)) {
          if (event.type === 'chunk') {
            const chunk = event.data as { text: string };
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              const lastMsg = updated[lastIdx];
              if (lastMsg && lastMsg.role === 'assistant') {
                // Create new object to avoid mutation issues
                const newContent = lastMsg.content + chunk.text;
                // Deduplicate: check against all previous non-empty lines
                const lines = newContent.split('\n');
                const seenLines = new Set<string>();
                const deduped: string[] = [];
                for (let i = 0; i < lines.length; i++) {
                  const trimmed = lines[i].trim();
                  // For non-empty lines, check if we've seen this exact text before
                  if (trimmed) {
                    if (seenLines.has(trimmed)) {
                      continue; // Skip duplicate
                    }
                    seenLines.add(trimmed);
                  }
                  deduped.push(lines[i]);
                }
                // Remove trailing empty lines
                while (deduped.length > 0 && !deduped[deduped.length - 1].trim()) {
                  deduped.pop();
                }
                updated[lastIdx] = { ...lastMsg, content: deduped.join('\n') };
              }
              return updated;
            });
          } else if (event.type === 'problem_ready') {
            const data = event.data as {
              problemData?: api.GeneratedProblem;
              solutionData?: api.GeneratedSolution;
            };
            if (data.problemData) {
              setProblemData(data.problemData);
            }
            if (data.solutionData) {
              setSolutionData(data.solutionData);
            }
          } else if (event.type === 'error') {
            const errorData = event.data as { error: string };
            setError(errorData.error);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chat failed');
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, accessToken, isStreaming],
  );

  const handleGenerateTestdata = async () => {
    if (!sessionId || !problemData || !solutionData) return;

    // Check cooldown
    if (cooldownRemaining > 0) {
      setError(t.aiProblemCreatorTestdataCooldown?.replace('{seconds}', String(Math.ceil(cooldownRemaining / 1000))) || `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds`);
      return;
    }

    setState('generating');
    setError(null);

    // Set cooldown immediately when starting generation
    const now = Date.now();
    setLastGenerateTime(now);
    setCooldownRemaining(GENERATE_COOLDOWN_MS);

    try {
      const testInputs = problemData.suggestedTestInputs || [];
      if (testInputs.length === 0) {
        throw new Error('No test inputs available. Please ask AI to generate test inputs.');
      }

      const result = await api.generateTestdata(
        sessionId,
        solutionData.code,
        solutionData.language,
        testInputs,
        accessToken,
      );

      if (result.success) {
        setTestCases(result.testCases);
        setTestdataKey(result.testdataKey || null);
        setState('ready');
      } else {
        // Translate known error codes
        let errorMessage = result.error || 'Failed to generate test data';
        if (errorMessage.includes('EMPTY_OUTPUT')) {
          errorMessage = t.aiProblemCreatorTestdataEmptyOutputError;
        } else if (errorMessage.includes('DOCKER_NOT_AVAILABLE')) {
          errorMessage = t.aiProblemCreatorTestdataDockerNotAvailable;
        }
        setError(errorMessage);
        setState('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test data');
      setState('preview');
    }
  };

  const handlePublish = async (editedProblem: api.GeneratedProblem) => {
    setState('publishing');
    setError(null);

    try {
      const result = await api.publishProblem(
        {
          title: editedProblem.title,
          description: editedProblem.description,
          inputFormat: editedProblem.inputFormat,
          outputFormat: editedProblem.outputFormat,
          sampleCases: editedProblem.sampleCases,
          difficulty: editedProblem.difficulty,
          tags: editedProblem.tags,
          timeLimitMs: editedProblem.constraints.timeLimitMs,
          memoryLimitKb: editedProblem.constraints.memoryLimitKb,
          testdataKey: testdataKey || undefined,
          autoTranslate,
        },
        accessToken,
      );

      setPublishedProblem(result);
      setState('published');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish problem');
      setState('ready');
    }
  };

  const handleGoToPreview = () => {
    if (problemData) {
      setState('preview');
    }
  };

  const handleGoToEdit = () => {
    setState('edit');
  };

  const handleBackToChat = () => {
    setState('chat');
  };

  const handleViewProblem = () => {
    if (publishedProblem) {
      router.push(`/problems/${publishedProblem.displayId}`);
      onClose();
    }
  };

  const handleClose = () => {
    // Reset state
    setState('chat');
    setSessionId(null);
    setMessages([]);
    setProblemData(null);
    setSolutionData(null);
    setTestdataKey(null);
    setTestCases([]);
    setPublishedProblem(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't close on backdrop click if:
    // 1. User has already sent messages (conversation started)
    // 2. Currently generating or publishing
    if (e.target === e.currentTarget && messages.length === 0 && state !== 'generating' && state !== 'publishing') {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[#003865] to-[#1e5d8f] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.aiProblemCreatorModalTitle}</h2>
              <p className="text-sm text-white/70">
                {state === 'chat' && t.aiProblemCreatorModalDescribeIdea}
                {state === 'preview' && t.aiProblemCreatorModalReviewProblem}
                {state === 'edit' && t.aiProblemCreatorModalEditDetails}
                {state === 'generating' && t.aiProblemCreatorModalGeneratingTestdata}
                {state === 'ready' && t.aiProblemCreatorModalReadyToPublish}
                {state === 'publishing' && t.aiProblemCreatorModalPublishing}
                {state === 'published' && t.aiProblemCreatorModalPublished}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {['chat', 'preview', 'ready', 'published'].map((step, index) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full transition-colors ${
                  ['chat', 'preview', 'edit', 'generating', 'ready', 'publishing', 'published'].indexOf(state) >= index
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={state === 'generating' || state === 'publishing'}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {state === 'chat' && (
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              problemReady={!!problemData}
              onGoToPreview={handleGoToPreview}
              error={error}
            />
          )}

          {state === 'preview' && problemData && (
            <ProblemPreview
              problem={problemData}
              solution={solutionData}
              onEdit={handleGoToEdit}
              onGenerateTestdata={handleGenerateTestdata}
              onBack={handleBackToChat}
              error={error}
              cooldownRemaining={cooldownRemaining}
            />
          )}

          {state === 'edit' && problemData && (
            <ProblemEditor
              problem={problemData}
              onSave={(edited) => {
                setProblemData(edited);
                setState('preview');
              }}
              onCancel={() => setState('preview')}
            />
          )}

          {state === 'generating' && (
            <TestdataProgress isGenerating={true} testCases={[]} />
          )}

          {state === 'ready' && problemData && (
            <PublishConfirmation
              problem={problemData}
              testCases={testCases}
              onPublish={() => handlePublish(problemData)}
              onEdit={handleGoToEdit}
              onBack={() => setState('preview')}
              error={error}
              autoTranslate={autoTranslate}
              onAutoTranslateChange={setAutoTranslate}
            />
          )}

          {state === 'publishing' && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-[#003865] border-t-transparent" />
                <p className="text-lg text-gray-600">{t.aiProblemCreatorModalPublishingProblem}</p>
              </div>
            </div>
          )}

          {state === 'published' && publishedProblem && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t.aiProblemCreatorModalProblemPublished}</h3>
                <p className="mt-2 text-gray-600">
                  {t.aiProblemCreatorModalProblemAvailable.replace('{title}', publishedProblem.title)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Problem ID: {publishedProblem.displayId}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={handleViewProblem}
                    className="rounded-lg bg-[#003865] px-6 py-2 text-white hover:bg-[#1e5d8f]"
                  >
                    {t.aiProblemCreatorModalViewProblem}
                  </button>
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    {t.aiProblemCreatorModalClose}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
