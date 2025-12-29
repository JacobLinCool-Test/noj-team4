import { ProgrammingLanguage } from '@prisma/client';

/**
 * 原始碼驗證錯誤
 */
export class SourceValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'SourceValidationError';
  }
}

/**
 * 語言對應的允許副檔名
 */
const ALLOWED_EXTENSIONS: Record<ProgrammingLanguage, string[]> = {
  C: ['.c'],
  CPP: ['.cpp', '.cc', '.cxx'],
  JAVA: ['.java'],
  PYTHON: ['.py'],
};

/**
 * 危險的檔案名稱（單一檔案提交時檢查）
 */
const DANGEROUS_SINGLE_FILE_NAMES = [
  '.env',
  'docker-compose.yml',
  'Dockerfile',
  'package.json',
  'tsconfig.json',
];

/**
 * 禁止的關鍵字（可選，用於額外的安全檢查）
 */
const SUSPICIOUS_PATTERNS = [
  /import\s+subprocess/i,
  /import\s+os\s*$/m,
  /from\s+os\s+import/i,
  /exec\s*\(/,
  /eval\s*\(/,
  /compile\s*\(/,
  /__import__\s*\(/,
  /system\s*\(/,
  /popen\s*\(/,
  /fork\s*\(/,
  /execve?\s*\(/,
];

/**
 * 驗證選項
 */
export interface SourceValidationOptions {
  /** 是否檢查可疑模式 */
  checkSuspiciousPatterns?: boolean;
  /** 最大原始碼大小 (bytes) */
  maxSourceSize?: number;
  /** 是否允許空白原始碼 */
  allowEmpty?: boolean;
}

const DEFAULT_OPTIONS: Required<SourceValidationOptions> = {
  checkSuspiciousPatterns: false, // 預設不檢查，因為有些是合法使用
  maxSourceSize: 1024 * 1024, // 1MB
  allowEmpty: false,
};

/**
 * 驗證單一檔案原始碼
 * @param sourceCode 原始碼內容
 * @param language 程式語言
 * @param fileName 檔案名稱（可選）
 * @param options 驗證選項
 */
export function validateSingleFileSource(
  sourceCode: string,
  language: ProgrammingLanguage,
  fileName?: string,
  options: SourceValidationOptions = {},
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 檢查原始碼大小
  const sourceSize = Buffer.byteLength(sourceCode, 'utf8');
  if (sourceSize > opts.maxSourceSize) {
    throw new SourceValidationError(
      `原始碼大小 ${sourceSize} bytes 超過限制 ${opts.maxSourceSize} bytes`,
      'SOURCE_TOO_LARGE',
    );
  }

  // 檢查是否為空
  if (!opts.allowEmpty && sourceCode.trim().length === 0) {
    throw new SourceValidationError(
      '原始碼不能為空',
      'SOURCE_EMPTY',
    );
  }

  // 檢查檔案名稱
  if (fileName) {
    // 檢查是否為危險檔案名
    if (DANGEROUS_SINGLE_FILE_NAMES.includes(fileName.toLowerCase())) {
      throw new SourceValidationError(
        `不允許的檔案名稱: ${fileName}`,
        'SOURCE_DANGEROUS_FILENAME',
      );
    }

    // 檢查副檔名
    const ext = getExtension(fileName);
    const allowedExts = ALLOWED_EXTENSIONS[language];
    if (allowedExts && ext && !allowedExts.includes(ext.toLowerCase())) {
      throw new SourceValidationError(
        `副檔名 ${ext} 與語言 ${language} 不符`,
        'SOURCE_EXTENSION_MISMATCH',
      );
    }
  }

  // 檢查可疑模式（可選）
  if (opts.checkSuspiciousPatterns) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(sourceCode)) {
        throw new SourceValidationError(
          `偵測到可疑模式: ${pattern.source}`,
          'SOURCE_SUSPICIOUS_PATTERN',
        );
      }
    }
  }
}

/**
 * 多檔案驗證選項
 */
export interface MultiFileValidationOptions {
  /** 是否跳過主檔案檢查（當老師提供 Makefile 時可跳過） */
  skipMainFileCheck?: boolean;
}

/**
 * 驗證多檔案提交的檔案名稱列表
 * @param fileNames 檔案名稱列表
 * @param language 程式語言
 * @param options 驗證選項
 */
export function validateMultiFileNames(
  fileNames: string[],
  language: ProgrammingLanguage,
  options?: MultiFileValidationOptions,
): void {
  // 檢查是否有檔案
  if (fileNames.length === 0) {
    throw new SourceValidationError(
      '提交必須包含至少一個檔案',
      'SOURCE_NO_FILES',
    );
  }

  // 檢查每個檔案名稱
  for (const fileName of fileNames) {
    // 路徑穿越檢查
    if (fileName.includes('..') || fileName.startsWith('/')) {
      throw new SourceValidationError(
        `不安全的檔案路徑: ${fileName}`,
        'SOURCE_UNSAFE_PATH',
      );
    }

    // 隱藏檔案檢查（除了特定允許的）
    const basename = getBasename(fileName);
    if (basename.startsWith('.') && basename !== '.gitignore') {
      throw new SourceValidationError(
        `不允許隱藏檔案: ${fileName}`,
        'SOURCE_HIDDEN_FILE',
      );
    }
  }

  // 檢查是否有主檔案（當老師提供 Makefile 時可跳過）
  if (!options?.skipMainFileCheck) {
    const hasMainFile = fileNames.some((f) => isMainFile(f, language));
    if (!hasMainFile) {
      throw new SourceValidationError(
        `缺少主程式檔案（${getMainFileName(language)}）`,
        'SOURCE_NO_MAIN_FILE',
      );
    }
  }
}

/**
 * 取得檔案副檔名
 */
function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex !== -1 ? fileName.substring(dotIndex) : '';
}

/**
 * 取得檔案基本名稱
 */
function getBasename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
}

/**
 * 檢查是否為主程式檔案
 */
function isMainFile(fileName: string, language: ProgrammingLanguage): boolean {
  const basename = getBasename(fileName).toLowerCase();
  switch (language) {
    case 'C':
      return basename === 'main.c';
    case 'CPP':
      return basename === 'main.cpp' || basename === 'main.cc' || basename === 'main.cxx';
    case 'JAVA':
      return basename === 'main.java';
    case 'PYTHON':
      return basename === 'main.py';
    default:
      return false;
  }
}

/**
 * 取得語言的主程式檔案名稱
 */
function getMainFileName(language: ProgrammingLanguage): string {
  switch (language) {
    case 'C':
      return 'main.c';
    case 'CPP':
      return 'main.cpp';
    case 'JAVA':
      return 'Main.java';
    case 'PYTHON':
      return 'main.py';
    default:
      return 'main.*';
  }
}
