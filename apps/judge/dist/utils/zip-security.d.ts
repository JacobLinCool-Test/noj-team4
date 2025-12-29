import AdmZip from 'adm-zip';
export declare class ZipSecurityError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export interface ZipValidationOptions {
    maxUncompressedSize?: number;
    checkDangerousFiles?: boolean;
    allowSymlinks?: boolean;
    customBlacklist?: string[];
}
export declare function validateZipSecurity(zip: AdmZip, options?: ZipValidationOptions): void;
export declare function extractZipSecurely(zip: AdmZip, targetDir: string, options?: ZipValidationOptions): Promise<string[]>;
export declare function extractBufferSecurely(buffer: Buffer, targetDir: string, options?: ZipValidationOptions): Promise<string[]>;
export declare function extractBase64Securely(base64Content: string, targetDir: string, options?: ZipValidationOptions): Promise<string[]>;
