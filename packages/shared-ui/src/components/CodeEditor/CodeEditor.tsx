'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { OnMount, OnChange, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useIsMobile } from '../../hooks/useIsMobile';
import { LANGUAGE_TO_MONACO, getMonacoLanguage, type ProgrammingLanguage } from './language-map';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-800">
        <div className="text-sm text-gray-400">Loading editor...</div>
      </div>
    ),
  }
);

const FONT_FAMILY =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 50;

export interface CodeEditorProps {
  /** Current code value */
  value: string;
  /** Callback when code changes */
  onChange?: (value: string) => void;
  /** Programming language (NOJ format: C, CPP, JAVA, PYTHON, AUTO) or Monaco format */
  language: ProgrammingLanguage | 'AUTO' | string;
  /** Editor height (CSS value) */
  height?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text for mobile fallback */
  placeholder?: string;
  /** Whether to show font size controls */
  showFontControls?: boolean;
  /** Initial font size */
  fontSize?: number;
  /** Callback when font size changes */
  onFontSizeChange?: (size: number) => void;
  /** Monaco editor theme */
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = '400px',
  readOnly = false,
  className = '',
  placeholder = '',
  showFontControls = true,
  fontSize: initialFontSize = 14,
  onFontSizeChange,
  theme = 'vs-dark',
}: CodeEditorProps) {
  const isMobile = useIsMobile();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [fontSize, setFontSize] = useState(initialFontSize);

  // Sync font size when prop changes
  useEffect(() => {
    setFontSize(initialFontSize);
  }, [initialFontSize]);

  const handleFontSizeChange = useCallback(
    (delta: number) => {
      setFontSize((prevSize) => {
        const newSize = Math.min(
          MAX_FONT_SIZE,
          Math.max(MIN_FONT_SIZE, prevSize + delta)
        );
        if (newSize !== prevSize) {
          if (editorRef.current) {
            editorRef.current.updateOptions({ fontSize: newSize });
          }
          onFontSizeChange?.(newSize);
        }
        return newSize;
      });
    },
    [onFontSizeChange]
  );

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      editor.updateOptions({ fontSize });

      if (typeof document !== 'undefined' && 'fonts' in document) {
        document.fonts.ready.then(() => {
          monaco.editor.remeasureFonts();
        });
      }
    },
    [fontSize]
  );

  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const fontControls = showFontControls && !isMobile && (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md bg-gray-900/60 p-0.5 opacity-40 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100">
      <button
        type="button"
        onClick={() => handleFontSizeChange(-2)}
        disabled={fontSize <= MIN_FONT_SIZE}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-200 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        title="Decrease font size"
      >
        <span className="text-sm font-medium">-</span>
      </button>
      <div className="h-4 w-px bg-gray-500/50" />
      <button
        type="button"
        onClick={() => handleFontSizeChange(2)}
        disabled={fontSize >= MAX_FONT_SIZE}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-200 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        title="Increase font size"
      >
        <span className="text-sm font-medium">+</span>
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div className={`relative ${className}`}>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full resize-none rounded-md border border-gray-300 bg-white p-3 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865] ${
            readOnly ? 'cursor-default bg-gray-50' : ''
          }`}
          style={{ height, fontFamily: FONT_FAMILY, fontSize }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          Mobile mode
        </div>
      </div>
    );
  }

  // Determine Monaco language - support both NOJ format and string format
  const monacoLanguage =
    LANGUAGE_TO_MONACO[language as ProgrammingLanguage | 'AUTO'] ||
    getMonacoLanguage(language);

  const options: editor.IStandaloneEditorConstructionOptions = {
    fontSize,
    fontFamily: FONT_FAMILY,
    fontLigatures: false,
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'off',
    folding: true,
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    formatOnPaste: false,
    formatOnType: false,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    ...(readOnly && {
      readOnly: true,
      domReadOnly: true,
      cursorStyle: 'line' as const,
      renderLineHighlight: 'none' as const,
      selectionHighlight: false,
      occurrencesHighlight: 'off' as const,
    }),
  };

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-gray-300 ${className}`}
    >
      {fontControls}
      <MonacoEditor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={theme}
        options={options}
        loading={
          <div className="flex h-full items-center justify-center bg-gray-800">
            <div className="text-sm text-gray-400">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
}
