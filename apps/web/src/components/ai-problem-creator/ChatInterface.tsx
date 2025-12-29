'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type Props = {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  problemReady: boolean;
  onGoToPreview: () => void;
  error: string | null;
};

export function ChatInterface({
  messages,
  onSendMessage,
  isStreaming,
  problemReady,
  onGoToPreview,
  error,
}: Props) {
  const { messages: t } = useI18n();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send if using IME (composing Chinese/Japanese/Korean characters)
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#003865] to-[#1e5d8f]">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{t.aiProblemCreatorChatStartTitle}</h3>
            <p className="mt-2 max-w-md text-gray-600">
              {t.aiProblemCreatorChatStartDesc}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setInput(t.aiProblemCreatorChatPlaceholder.includes('Describe') ? 'Create a problem about finding the sum of an array' : '創建一道關於計算陣列總和的題目')}
                className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="font-medium">{t.aiProblemCreatorChatTemplateArraySum}</span>
                <br />
                <span className="text-gray-500">{t.aiProblemCreatorChatTemplateArraySumDesc}</span>
              </button>
              <button
                onClick={() => setInput(t.aiProblemCreatorChatPlaceholder.includes('Describe') ? 'Create a problem about checking if a string is a palindrome' : '創建一道關於檢查字串是否為迴文的題目')}
                className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="font-medium">{t.aiProblemCreatorChatTemplatePalindrome}</span>
                <br />
                <span className="text-gray-500">{t.aiProblemCreatorChatTemplatePalindromeDesc}</span>
              </button>
              <button
                onClick={() => setInput(t.aiProblemCreatorChatPlaceholder.includes('Describe') ? 'Create a problem about binary search in a sorted array' : '創建一道關於在排序陣列中進行二分搜尋的題目')}
                className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="font-medium">{t.aiProblemCreatorChatTemplateBinarySearch}</span>
                <br />
                <span className="text-gray-500">{t.aiProblemCreatorChatTemplateBinarySearchDesc}</span>
              </button>
              <button
                onClick={() => setInput(t.aiProblemCreatorChatPlaceholder.includes('Describe') ? 'Create a problem about finding prime numbers up to N' : '創建一道關於找出 N 以內質數的題目')}
                className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="font-medium">{t.aiProblemCreatorChatTemplatePrime}</span>
                <br />
                <span className="text-gray-500">{t.aiProblemCreatorChatTemplatePrimeDesc}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#003865] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} className="ai-chat-markdown" />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Problem ready banner */}
      {problemReady && !isStreaming && (
        <div className="mx-6 mb-4 flex items-center justify-between rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800">{t.aiProblemCreatorChatProblemReady}</p>
              <p className="text-sm text-green-600">{t.aiProblemCreatorChatProblemReadyDesc}</p>
            </div>
          </div>
          <button
            onClick={onGoToPreview}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {t.aiProblemCreatorChatPreviewProblem}
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.aiProblemCreatorChatPlaceholder}
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f] disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="rounded-lg bg-[#003865] px-6 py-3 text-white hover:bg-[#1e5d8f] disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          {t.aiProblemCreatorChatHint}
        </p>
      </form>
    </div>
  );
}
