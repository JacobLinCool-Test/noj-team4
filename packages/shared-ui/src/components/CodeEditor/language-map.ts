/**
 * Programming language type supported by NOJ
 */
export type ProgrammingLanguage = 'C' | 'CPP' | 'JAVA' | 'PYTHON';

/**
 * Mapping from NOJ programming languages to Monaco editor language identifiers
 */
export const LANGUAGE_TO_MONACO: Record<ProgrammingLanguage | 'AUTO', string> = {
  C: 'c',
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'python',
  AUTO: 'plaintext',
};

/**
 * Get Monaco language identifier from string (case-insensitive)
 */
export function getMonacoLanguage(lang: string): string {
  const languageMap: Record<string, string> = {
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    java: 'java',
    python: 'python',
    python3: 'python',
    py: 'python',
    go: 'go',
    rust: 'rust',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
  };
  return languageMap[lang.toLowerCase()] || 'plaintext';
}
