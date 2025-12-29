'use client';

import { useState, useCallback, ChangeEvent, CompositionEvent } from 'react';

/**
 * Custom hook to block Chinese characters and Zhuyin input
 * Also detects when Chinese input method is active
 */
export function useBlockChineseInput() {
  const [isComposing, setIsComposing] = useState(false);

  const handleCompositionStart = useCallback((e: CompositionEvent<HTMLInputElement>) => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    // Clear any Chinese characters that were entered during composition
    const target = e.target as HTMLInputElement;
    const cleanedValue = target.value.replace(/[\u4e00-\u9fff\u3105-\u312F\u3400-\u4DBF\uF900-\uFAFF\u02C7\u02CA\u02CB\u02D9\u02EA\u02EB]/g, '');
    if (cleanedValue !== target.value) {
      target.value = cleanedValue;
      // Trigger a change event so the parent component updates
      const event = new Event('input', { bubbles: true });
      target.dispatchEvent(event);
    }
  }, []);

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement>,
    originalOnChange: (value: string) => void
  ) => {
    const value = e.target.value;
    // Remove Chinese characters and Zhuyin (Bopomofo)
    // Unicode ranges:
    // - \u4e00-\u9fff: Common Chinese characters
    // - \u3105-\u312F: Bopomofo (Zhuyin)
    // - \u3400-\u4DBF: Extension A
    // - \uF900-\uFAFF: Compatibility Ideographs
    // - \u02C7, \u02CA, \u02CB, \u02D9: Bopomofo tone marks (ˇˊˋ˙)
    // - \u02EA, \u02EB: Additional tone marks
    const cleanedValue = value.replace(/[\u4e00-\u9fff\u3105-\u312F\u3400-\u4DBF\uF900-\uFAFF\u02C7\u02CA\u02CB\u02D9\u02EA\u02EB]/g, '');

    originalOnChange(cleanedValue);
  }, []);

  return {
    isComposing,
    handleCompositionStart,
    handleCompositionEnd,
    handleChange,
  };
}
