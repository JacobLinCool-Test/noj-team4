import { ProgrammingLanguage } from '@prisma/client';
export declare class SourceValidationError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export interface SourceValidationOptions {
    checkSuspiciousPatterns?: boolean;
    maxSourceSize?: number;
    allowEmpty?: boolean;
}
export declare function validateSingleFileSource(sourceCode: string, language: ProgrammingLanguage, fileName?: string, options?: SourceValidationOptions): void;
export interface MultiFileValidationOptions {
    skipMainFileCheck?: boolean;
}
export declare function validateMultiFileNames(fileNames: string[], language: ProgrammingLanguage, options?: MultiFileValidationOptions): void;
