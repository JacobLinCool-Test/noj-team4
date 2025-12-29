import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Zip 安全檢查相關錯誤
 */
export class ZipSecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ZipSecurityError';
  }
}

/**
 * 危險檔案黑名單
 */
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

/**
 * 危險檔案副檔名
 */
const DANGEROUS_EXTENSIONS = ['.pem', '.key', '.crt', '.pfx'];

export interface ZipValidationOptions {
  /** 最大解壓縮後大小 (bytes) */
  maxUncompressedSize?: number;
  /** 是否檢查危險檔案 */
  checkDangerousFiles?: boolean;
  /** 是否允許符號連結 */
  allowSymlinks?: boolean;
  /** 自訂危險檔案黑名單 */
  customBlacklist?: string[];
}

const DEFAULT_OPTIONS: Required<ZipValidationOptions> = {
  maxUncompressedSize: 100 * 1024 * 1024, // 100MB
  checkDangerousFiles: true,
  allowSymlinks: false,
  customBlacklist: [],
};

/**
 * 驗證 ZIP 檔案的安全性
 * 檢查項目：
 * 1. 路徑穿越攻擊 (Zip Slip)
 * 2. 絕對路徑
 * 3. 符號連結
 * 4. 解壓縮後大小
 * 5. 危險檔案
 */
export function validateZipSecurity(
  zip: AdmZip,
  options: ZipValidationOptions = {},
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const entries = zip.getEntries();

  // 計算總解壓縮大小
  const totalSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);
  if (totalSize > opts.maxUncompressedSize) {
    throw new ZipSecurityError(
      `解壓縮後大小 ${totalSize} bytes 超過限制 ${opts.maxUncompressedSize} bytes`,
      'ZIP_UNCOMPRESSED_TOO_LARGE',
    );
  }

  const blacklist = [...DANGEROUS_FILES, ...opts.customBlacklist];

  for (const entry of entries) {
    const entryName = entry.entryName;

    // 檢查路徑穿越攻擊
    if (entryName.includes('..')) {
      throw new ZipSecurityError(
        `偵測到路徑穿越攻擊: ${entryName}`,
        'ZIP_PATH_TRAVERSAL_DETECTED',
      );
    }

    // 檢查絕對路徑
    if (entryName.startsWith('/')) {
      throw new ZipSecurityError(
        `不允許絕對路徑: ${entryName}`,
        'ZIP_ABSOLUTE_PATH_NOT_ALLOWED',
      );
    }

    // 檢查符號連結 (Unix symlink mode: 0o120000)
    if (!opts.allowSymlinks && !entry.isDirectory && entry.header.attr === 0o120000) {
      throw new ZipSecurityError(
        `不允許符號連結: ${entryName}`,
        'ZIP_SYMLINK_NOT_ALLOWED',
      );
    }

    // 檢查危險檔案
    if (opts.checkDangerousFiles) {
      const basename = path.basename(entryName);
      const ext = path.extname(entryName).toLowerCase();

      if (blacklist.includes(basename)) {
        throw new ZipSecurityError(
          `偵測到危險檔案: ${entryName}`,
          'ZIP_DANGEROUS_FILE_DETECTED',
        );
      }

      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        throw new ZipSecurityError(
          `偵測到危險檔案類型: ${entryName}`,
          'ZIP_DANGEROUS_EXTENSION_DETECTED',
        );
      }
    }
  }
}

/**
 * 安全地解壓縮 ZIP 到目標目錄
 * 會先進行安全檢查，然後逐檔案解壓縮（而非使用 extractAllTo）
 */
export async function extractZipSecurely(
  zip: AdmZip,
  targetDir: string,
  options: ZipValidationOptions = {},
): Promise<string[]> {
  // 先進行安全檢查
  validateZipSecurity(zip, options);

  // 確保目標目錄存在
  await fs.ensureDir(targetDir);

  const extractedFiles: string[] = [];
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) {
      // 創建目錄
      const dirPath = path.join(targetDir, entry.entryName);
      await fs.ensureDir(dirPath);
    } else {
      // 解壓縮檔案
      const filePath = path.join(targetDir, entry.entryName);

      // 再次確認路徑安全（正規化後仍在目標目錄內）
      const realTargetDir = await fs.realpath(targetDir);
      const realFilePath = path.resolve(targetDir, entry.entryName);

      if (!realFilePath.startsWith(realTargetDir + path.sep) && realFilePath !== realTargetDir) {
        throw new ZipSecurityError(
          `路徑超出目標目錄: ${entry.entryName}`,
          'ZIP_PATH_ESCAPE_DETECTED',
        );
      }

      // 確保父目錄存在
      await fs.ensureDir(path.dirname(filePath));

      // 寫入檔案
      const content = entry.getData();
      await fs.writeFile(filePath, content);
      extractedFiles.push(entry.entryName);
    }
  }

  return extractedFiles;
}

/**
 * 從 Buffer 創建 AdmZip 並進行安全解壓縮
 */
export async function extractBufferSecurely(
  buffer: Buffer,
  targetDir: string,
  options: ZipValidationOptions = {},
): Promise<string[]> {
  const zip = new AdmZip(buffer);
  return extractZipSecurely(zip, targetDir, options);
}

/**
 * 從 Base64 字串創建 AdmZip 並進行安全解壓縮
 */
export async function extractBase64Securely(
  base64Content: string,
  targetDir: string,
  options: ZipValidationOptions = {},
): Promise<string[]> {
  const buffer = Buffer.from(base64Content, 'base64');
  return extractBufferSecurely(buffer, targetDir, options);
}
