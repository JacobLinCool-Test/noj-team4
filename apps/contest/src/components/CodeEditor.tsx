'use client';

import { CodeEditor as SharedCodeEditor, getMonacoLanguage } from '@noj/shared-ui';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
  readOnly?: boolean;
}

/**
 * CodeEditor for contest app
 * Uses shared CodeEditor component with simplified interface
 */
export function CodeEditor({
  value,
  onChange,
  language,
  height = '400px',
  readOnly = false,
}: CodeEditorProps) {
  return (
    <SharedCodeEditor
      value={value}
      onChange={onChange}
      language={language}
      height={height}
      readOnly={readOnly}
      showFontControls={false}
      fontSize={14}
    />
  );
}
