"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceValidationError = void 0;
exports.validateSingleFileSource = validateSingleFileSource;
exports.validateMultiFileNames = validateMultiFileNames;
class SourceValidationError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'SourceValidationError';
    }
}
exports.SourceValidationError = SourceValidationError;
const ALLOWED_EXTENSIONS = {
    C: ['.c'],
    CPP: ['.cpp', '.cc', '.cxx'],
    JAVA: ['.java'],
    PYTHON: ['.py'],
};
const DANGEROUS_SINGLE_FILE_NAMES = [
    '.env',
    'docker-compose.yml',
    'Dockerfile',
    'package.json',
    'tsconfig.json',
];
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
const DEFAULT_OPTIONS = {
    checkSuspiciousPatterns: false,
    maxSourceSize: 1024 * 1024,
    allowEmpty: false,
};
function validateSingleFileSource(sourceCode, language, fileName, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sourceSize = Buffer.byteLength(sourceCode, 'utf8');
    if (sourceSize > opts.maxSourceSize) {
        throw new SourceValidationError(`原始碼大小 ${sourceSize} bytes 超過限制 ${opts.maxSourceSize} bytes`, 'SOURCE_TOO_LARGE');
    }
    if (!opts.allowEmpty && sourceCode.trim().length === 0) {
        throw new SourceValidationError('原始碼不能為空', 'SOURCE_EMPTY');
    }
    if (fileName) {
        if (DANGEROUS_SINGLE_FILE_NAMES.includes(fileName.toLowerCase())) {
            throw new SourceValidationError(`不允許的檔案名稱: ${fileName}`, 'SOURCE_DANGEROUS_FILENAME');
        }
        const ext = getExtension(fileName);
        const allowedExts = ALLOWED_EXTENSIONS[language];
        if (allowedExts && ext && !allowedExts.includes(ext.toLowerCase())) {
            throw new SourceValidationError(`副檔名 ${ext} 與語言 ${language} 不符`, 'SOURCE_EXTENSION_MISMATCH');
        }
    }
    if (opts.checkSuspiciousPatterns) {
        for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(sourceCode)) {
                throw new SourceValidationError(`偵測到可疑模式: ${pattern.source}`, 'SOURCE_SUSPICIOUS_PATTERN');
            }
        }
    }
}
function validateMultiFileNames(fileNames, language, options) {
    if (fileNames.length === 0) {
        throw new SourceValidationError('提交必須包含至少一個檔案', 'SOURCE_NO_FILES');
    }
    for (const fileName of fileNames) {
        if (fileName.includes('..') || fileName.startsWith('/')) {
            throw new SourceValidationError(`不安全的檔案路徑: ${fileName}`, 'SOURCE_UNSAFE_PATH');
        }
        const basename = getBasename(fileName);
        if (basename.startsWith('.') && basename !== '.gitignore') {
            throw new SourceValidationError(`不允許隱藏檔案: ${fileName}`, 'SOURCE_HIDDEN_FILE');
        }
    }
    if (!options?.skipMainFileCheck) {
        const hasMainFile = fileNames.some((f) => isMainFile(f, language));
        if (!hasMainFile) {
            throw new SourceValidationError(`缺少主程式檔案（${getMainFileName(language)}）`, 'SOURCE_NO_MAIN_FILE');
        }
    }
}
function getExtension(fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex !== -1 ? fileName.substring(dotIndex) : '';
}
function getBasename(filePath) {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
}
function isMainFile(fileName, language) {
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
function getMainFileName(language) {
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
//# sourceMappingURL=source-validation.js.map