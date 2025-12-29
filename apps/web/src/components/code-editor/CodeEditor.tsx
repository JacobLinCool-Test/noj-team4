'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { CodeEditor as SharedCodeEditor, type ProgrammingLanguage } from '@noj/shared-ui';
import { usePreferences } from '@/providers/PreferencesProvider';

const SAVE_DELAY_MS = 1000;

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: ProgrammingLanguage | 'AUTO';
  height?: string;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  showFontControls?: boolean;
}

/**
 * CodeEditor with user preferences integration
 * Uses shared CodeEditor component and syncs font size with user preferences
 */
export function CodeEditor({
  value,
  onChange,
  language,
  height = '400px',
  readOnly = false,
  className = '',
  placeholder = '',
  showFontControls = true,
}: CodeEditorProps) {
  const { preferences, updatePreferences } = usePreferences();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fontSize, setFontSize] = useState(preferences.editorFontSize);

  // Sync with preferences
  useEffect(() => {
    setFontSize(preferences.editorFontSize);
  }, [preferences.editorFontSize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleFontSizeChange = useCallback(
    (newSize: number) => {
      setFontSize(newSize);
      // Clear existing timeout and set new one for debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updatePreferences({ editorFontSize: newSize });
      }, SAVE_DELAY_MS);
    },
    [updatePreferences]
  );

  return (
    <SharedCodeEditor
      value={value}
      onChange={onChange}
      language={language}
      height={height}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder}
      showFontControls={showFontControls}
      fontSize={fontSize}
      onFontSizeChange={handleFontSizeChange}
    />
  );
}
