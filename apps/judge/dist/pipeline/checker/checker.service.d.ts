import { ProgrammingLanguage } from '@prisma/client';
import { MinioService } from '../../minio/minio.service';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
export interface CheckerInput {
    inputFile: string;
    outputFile: string;
    answerFile: string;
}
export interface CheckerResult {
    passed: boolean;
    message?: string;
    exitCode: number;
}
export declare class CheckerService {
    private readonly minio;
    private readonly sandbox;
    private readonly logger;
    constructor(minio: MinioService, sandbox: SandboxRunner);
    runChecker(checkerKey: string, checkerLanguage: ProgrammingLanguage, input: CheckerInput, jobDir: string): Promise<CheckerResult>;
    private runPythonChecker;
    private runCompiledChecker;
    private parseScriptResult;
    private getSourceFilename;
    private getRunCommand;
}
