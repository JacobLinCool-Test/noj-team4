'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import {
  getGeneralAiAvailability,
  getAiAvailability,
  startGeneralAiChatStream,
  getLatestConversation,
  startNewConversation,
  type AiAvailability,
} from "@/lib/api/ai-assistant";
import { VtuberWrapper, type VtuberCanvasHandle } from "@/components/vtuber";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

const VRM_URL = "/vtuber/flare.vrm";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ProblemContext = {
  displayId: string;
  homeworkId?: string;
} | null;

// Expand icon (arrows pointing outward)
function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
    </svg>
  );
}

// Collapse icon (arrows pointing inward)
function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
    </svg>
  );
}

// Close icon
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Plus icon (new chat)
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

// Parse the current URL to detect problem context
function parseProblemContext(pathname: string): ProblemContext {
  // Match patterns like:
  // /problems/[displayId]
  // /courses/[courseSlug]/homework/[homeworkId]/problems/[displayId]
  // /courses/[courseSlug]/problems/[displayId]

  // Homework problem pattern
  const homeworkMatch = pathname.match(/\/courses\/[^/]+\/homework\/([^/]+)\/problems\/([^/]+)/);
  if (homeworkMatch) {
    return {
      displayId: homeworkMatch[2],
      homeworkId: homeworkMatch[1],
    };
  }

  // Course problem pattern
  const courseProblemMatch = pathname.match(/\/courses\/[^/]+\/problems\/([^/]+)/);
  if (courseProblemMatch && !pathname.includes("/edit") && !pathname.includes("/new")) {
    return {
      displayId: courseProblemMatch[1],
    };
  }

  // Public problem pattern
  const publicProblemMatch = pathname.match(/\/problems\/([^/]+)/);
  if (publicProblemMatch && !pathname.includes("/edit") && !pathname.includes("/new")) {
    return {
      displayId: publicProblemMatch[1],
    };
  }

  return null;
}

const EXPIRY_HOURS = 3;

export function GlobalAiAssistant() {
  const { messages } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messagesList, setMessagesList] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const vtuberRef = useRef<VtuberCanvasHandle | null>(null);

  // Helper to dispatch VTuber events
  const dispatchVtuber = useCallback((type: 'USER_SENT' | 'ASSISTANT_THINKING_START' | 'ASSISTANT_SPEAKING_START' | 'ASSISTANT_SPEAKING_END' | 'ASSISTANT_TOKEN' | 'ASSISTANT_ERROR', token?: string) => {
    if (type === 'ASSISTANT_TOKEN' && token) {
      vtuberRef.current?.dispatch({ type, token });
    } else {
      vtuberRef.current?.dispatch({ type } as Parameters<VtuberCanvasHandle['dispatch']>[0]);
    }
  }, []);

  // Detect problem context from URL
  const problemContext = parseProblemContext(pathname);

  // Load conversation history on mount
  useEffect(() => {
    if (!user || !accessToken || historyLoaded) return;

    const loadHistory = async () => {
      try {
        const data = await getLatestConversation(accessToken);

        if (data.conversation) {
          const lastActive = new Date(data.conversation.lastActiveAt);
          const hoursElapsed = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

          if (hoursElapsed <= EXPIRY_HOURS) {
            // Conversation not expired, load history
            setConversationId(data.conversation.id);
            setMessagesList(data.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            })));
          }
          // If expired, don't load - next send will create new conversation
        }
      } catch {
        // Silently fail
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [user, accessToken, historyLoaded]);

  // Handle starting a new conversation
  const handleNewConversation = async () => {
    try {
      await startNewConversation(accessToken);
    } catch {
      // Silently fail
    }
    setConversationId(null);
    setMessagesList([]);
    setShowNewChatConfirm(false);
  };

  const mapErrorMessage = useCallback((value: string) => {
    const mapping: Record<string, string> = {
      OPENAI_API_KEY_MISSING: messages.aiAssistantErrorProviderNotReady,
      GEMINI_API_KEY_MISSING: messages.aiAssistantErrorProviderNotReady,
      AI_PROVIDER_NOT_CONFIGURED: messages.aiAssistantErrorProviderNotReady,
      OPENAI_ERROR_401: messages.aiAssistantErrorProviderAuth,
      GEMINI_ERROR_401: messages.aiAssistantErrorProviderAuth,
      AI_RATE_LIMITED: messages.aiAssistantErrorRateLimit,
      AI_DISABLED: messages.aiAssistantErrorDisabled,
      AI_DISABLED_BY_ASSIGNMENT: messages.aiAssistantErrorDisabled,
      CONVERSATION_NOT_FOUND: messages.aiAssistantErrorConversation,
      EMPTY_MESSAGE: messages.aiAssistantErrorEmpty,
    };

    if (mapping[value]) return mapping[value];
    if (/^[A-Z0-9_]+$/.test(value)) return messages.aiAssistantErrorGeneric;
    return value;
  }, [messages]);

  // Fetch availability
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchAvailability = async () => {
      try {
        let data: AiAvailability;
        if (problemContext) {
          data = await getAiAvailability(
            problemContext.displayId,
            accessToken,
            problemContext.homeworkId,
          );
        } else {
          data = await getGeneralAiAvailability(accessToken);
        }
        if (!cancelled) {
          setAvailability(data);
        }
      } catch (err) {
        if (!cancelled) {
          // Silently fail - AI assistant won't be shown
          setAvailability(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user, authLoading, problemContext?.displayId, problemContext?.homeworkId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messagesList, panelOpen, expanded]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send if using IME (composing Chinese/Japanese/Korean characters)
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    handleSend();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setError(null);
    setSending(true);

    // Dispatch: User sent message, VTuber starts thinking
    dispatchVtuber('USER_SENT');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    setMessagesList((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");

    try {
      // Always use general chat API, with currentProblemId for dynamic context
      const response = await startGeneralAiChatStream(
        {
          message: userMessage.content,
          conversationId: conversationId ?? undefined,
          currentProblemId: problemContext?.displayId,
          attachLatestSubmission: problemContext ? true : undefined,
          stream: true,
        },
        accessToken,
      );

      const newConversationId =
        response.headers.get("X-Conversation-Id") ?? conversationId;
      if (newConversationId) setConversationId(newConversationId);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(messages.errorGeneric);
      }

      // First chunk received - VTuber starts speaking
      let isFirstChunk = true;
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Dispatch speaking start on first chunk
        if (isFirstChunk) {
          dispatchVtuber('ASSISTANT_SPEAKING_START');
          isFirstChunk = false;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Dispatch token event for lip sync animation
        dispatchVtuber('ASSISTANT_TOKEN', chunk);

        setMessagesList((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id ? { ...msg, content: accumulated } : msg,
          ),
        );
      }

      // Stream complete - VTuber stops speaking
      dispatchVtuber('ASSISTANT_SPEAKING_END');
    } catch (err) {
      const raw = err instanceof Error ? err.message : messages.errorGeneric;
      setError(mapErrorMessage(raw));

      // Dispatch error event
      dispatchVtuber('ASSISTANT_ERROR');

      setMessagesList((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: messages.aiAssistantError }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  // Don't show while auth is loading
  if (authLoading) {
    return null;
  }

  // For logged-in users, wait for availability check
  if (user && loading) {
    return null;
  }

  // For logged-in users, don't show if AI is not available
  if (user && !availability?.canUse) {
    return null;
  }

  const contextLabel = problemContext
    ? messages.aiAssistantHintProblem.replace("{displayId}", problemContext.displayId)
    : messages.aiAssistantHint;

  // Inline new chat confirmation dialog
  const renderNewChatConfirm = () => showNewChatConfirm && (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <p className="mb-2 text-sm text-amber-800">
        {messages.aiAssistantNewChatConfirm}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNewConversation}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {messages.confirm}
        </button>
        <button
          type="button"
          onClick={() => setShowNewChatConfirm(false)}
          className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          {messages.cancel}
        </button>
      </div>
    </div>
  );

  // Inline chat messages rendering
  const renderChatMessages = (className?: string) => (
    <>
      {renderNewChatConfirm()}
      <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${className ?? ""}`}>
        {messagesList.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            {problemContext ? messages.aiAssistantEmpty : messages.aiAssistantEmptyGeneral}
          </div>
        ) : (
          messagesList.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "ml-auto whitespace-pre-wrap bg-[#003865] text-white"
                  : "mr-auto bg-gray-100 text-gray-800"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content} className="ai-chat-markdown" />
              ) : (
                msg.content
              )}
            </div>
          ))
        )}
      </div>
    </>
  );

  // Inline login prompt rendering
  const renderLoginPrompt = (className?: string) => (
    <div className={`border-t border-gray-200 px-4 py-4 ${className ?? ""}`}>
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <p className="mb-3 text-sm text-gray-600">
          {messages.aiAssistantLoginRequired}
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="inline-block rounded-full bg-[#003865] px-6 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
        >
          {messages.aiAssistantLoginButton}
        </Link>
      </div>
    </div>
  );

  // Inline chat input rendering
  const renderChatInput = (className?: string, rows?: number) => {
    // Show login prompt if not logged in
    if (!user) {
      return renderLoginPrompt(className);
    }

    return (
      <div className={`border-t border-gray-200 px-4 py-3 ${className ?? ""}`}>
        {error && (
          <p className="mb-2 text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={problemContext ? messages.aiAssistantPlaceholder : messages.aiAssistantPlaceholderGeneral}
            rows={rows ?? 2}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1e5d8f] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="h-10 self-end rounded-full bg-[#003865] px-4 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
          >
            {messages.aiAssistantSend}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating AI button */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => {
            setPanelOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#003865] text-sm font-medium text-white shadow-lg transition hover:bg-[#1e5d8f]"
        >
          AI
        </button>
      )}

      {/* Expanded Mode - Near fullscreen with left VTuber, right chat */}
      {panelOpen && expanded && (
        <>
          {/* Backdrop - click to close (transparent) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setPanelOpen(false);
              setExpanded(false);
            }}
          />
          <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:inset-8 lg:inset-16">
            {/* Header - Full width */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#003865]/10 p-1.5">
                  <svg className="h-full w-full text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{messages.aiAssistantTitle}</p>
                  <p className="text-xs text-gray-500">
                    {sending ? messages.aiAssistantSending : contextLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatConfirm(true)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  title={messages.aiAssistantNewChat}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  title="Collapse"
                >
                  <CollapseIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelOpen(false);
                    setExpanded(false);
                  }}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  title="Close"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content - Vertical on mobile/tablet, Horizontal on desktop */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              {/* VTuber area - Top on mobile/tablet, Left on desktop */}
              <div className="h-1/2 border-b border-gray-200 bg-gradient-to-br from-[#003865]/5 via-transparent to-[#003865]/10 lg:h-full lg:w-2/3 lg:border-b-0 lg:border-r">
                <VtuberWrapper
                  ref={vtuberRef}
                  vrmUrl={VRM_URL}
                  cameraMode="halfBody"
                  enableControls={true}
                  className="h-full w-full"
                />
              </div>

              {/* Chat area - Bottom on mobile/tablet, Right on desktop */}
              <div className="flex h-1/2 flex-col bg-white lg:h-full lg:w-1/3">
                {renderChatMessages()}
                {renderChatInput(undefined, 3)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Compact Mode - Small floating window */}
      {panelOpen && !expanded && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[580px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* VTuber Avatar Header */}
          <div className="relative flex flex-col items-center border-b border-gray-200 bg-gradient-to-b from-[#003865]/5 to-transparent pb-2 pt-3">
            {/* Control buttons */}
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowNewChatConfirm(true)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                title={messages.aiAssistantNewChat}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                title="Expand"
              >
                <ExpandIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                }}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                title="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {/* VTuber 3D Avatar */}
            <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#003865]/20 bg-gradient-to-b from-white to-gray-100 shadow-inner">
              <VtuberWrapper
                ref={vtuberRef}
                vrmUrl={VRM_URL}
                className="h-full w-full"
              />
            </div>
            {/* Title and status */}
            <div className="mt-2 text-center">
              <p className="text-sm font-semibold text-gray-900">{messages.aiAssistantTitle}</p>
              <p className="text-xs text-gray-500">
                {sending ? messages.aiAssistantSending : contextLabel}
              </p>
            </div>
          </div>

          {renderChatMessages()}
          {renderChatInput()}
        </div>
      )}
    </>
  );
}
