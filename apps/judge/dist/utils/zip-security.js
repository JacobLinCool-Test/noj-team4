"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipSecurityError = void 0;
exports.validateZipSecurity = validateZipSecurity;
exports.extractZipSecurely = extractZipSecurely;
exports.extractBufferSecurely = extractBufferSecurely;
exports.extractBase64Securely = extractBase64Securely;
const adm_zip_1 = __importDefault(require("adm-zip"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
class ZipSecurityError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ZipSecurityError';
    }
}
exports.ZipSecurityError = ZipSecurityError;
const DANGEROUS_FILES = [
    '.env',
    '.env.local',
    '.env.production',
    'docker-compose.yml',
    'docker-compose.yaml',
    'Dockerfile',
    '.dockerignore',
    '.git',
    '.gitignore',
    '.ssh',
    'id_rsa',
    'id_ed25519',
    'credentials.json',
    'secrets.json',
];
const DANGEROUS_EXTENSIONS = ['.pem', '.key', '.crt', '.pfx'];
const DEFAULT_OPTIONS = {
    maxUncompressedSize: 100 * 1024 * 1024,
    checkDangerousFiles: true,
    allowSymlinks: false,
    customBlacklist: [],
};
function validateZipSecurity(zip, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const entries = zip.getEntries();
    const totalSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);
    if (totalSize > opts.maxUncompressedSize) {
        throw new ZipSecurityError(`解壓縮後大小 ${totalSize} bytes 超過限制 ${opts.maxUncompressedSize} bytes`, 'ZIP_UNCOMPRESSED_TOO_LARGE');
    }
    const blacklist = [...DANGEROUS_FILES, ...opts.customBlacklist];
    for (const entry of entries) {
        const entryName = entry.entryName;
        if (entryName.includes('..')) {
            throw new ZipSecurityError(`偵測到路徑穿越攻擊: ${entryName}`, 'ZIP_PATH_TRAVERSAL_DETECTED');
        }
        if (entryName.startsWith('/')) {
            throw new ZipSecurityError(`不允許絕對路徑: ${entryName}`, 'ZIP_ABSOLUTE_PATH_NOT_ALLOWED');
        }
        if (!opts.allowSymlinks && !entry.isDirectory && entry.header.attr === 0o120000) {
            throw new ZipSecurityError(`不允許符號連結: ${entryName}`, 'ZIP_SYMLINK_NOT_ALLOWED');
        }
        if (opts.checkDangerousFiles) {
            const basename = path.basename(entryName);
            const ext = path.extname(entryName).toLowerCase();
            if (blacklist.includes(basename)) {
                throw new ZipSecurityError(`偵測到危險檔案: ${entryName}`, 'ZIP_DANGEROUS_FILE_DETECTED');
            }
            if (DANGEROUS_EXTENSIONS.includes(ext)) {
                throw new ZipSecurityError(`偵測到危險檔案類型: ${entryName}`, 'ZIP_DANGEROUS_EXTENSION_DETECTED');
            }
        }
    }
}
async function extractZipSecurely(zip, targetDir, options = {}) {
    validateZipSecurity(zip, options);
    await fs.ensureDir(targetDir);
    const extractedFiles = [];
    const entries = zip.getEntries();
    for (const entry of entries) {
        if (entry.isDirectory) {
            const dirPath = path.join(targetDir, entry.entryName);
            await fs.ensureDir(dirPath);
        }
        else {
            const filePath = path.join(targetDir, entry.entryName);
            const realTargetDir = await fs.realpath(targetDir);
            const realFilePath = path.resolve(targetDir, entry.entryName);
            if (!realFilePath.startsWith(realTargetDir + path.sep) && realFilePath !== realTargetDir) {
                throw new ZipSecurityError(`路徑超出目標目錄: ${entry.entryName}`, 'ZIP_PATH_ESCAPE_DETECTED');
            }
            await fs.ensureDir(path.dirname(filePath));
            const content = entry.getData();
            await fs.writeFile(filePath, content);
            extractedFiles.push(entry.entryName);
        }
    }
    return extractedFiles;
}
async function extractBufferSecurely(buffer, targetDir, options = {}) {
    const zip = new adm_zip_1.default(buffer);
    return extractZipSecurely(zip, targetDir, options);
}
async function extractBase64Securely(base64Content, targetDir, options = {}) {
    const buffer = Buffer.from(base64Content, 'base64');
    return extractBufferSecurely(buffer, targetDir, options);
}
//# sourceMappingURL=zip-security.js.map