import { ProgrammingLanguage, SubmissionStatus } from '@prisma/client';
import { SandboxJobContext, SandboxLimits, SandboxRunResult } from './sandbox.types';
export interface CompileOptions {
    compilerFlags?: string;
}
export interface SandboxRunner {
    createJob(submissionId: string): Promise<SandboxJobContext>;
    writeSource(job: SandboxJobContext, language: ProgrammingLanguage, sourceCode: string): Promise<void>;
    compile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<{
        status: SubmissionStatus;
        log?: string;
    }>;
    compileWithMakefile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<{
        status: SubmissionStatus;
        log?: string;
    }>;
    lint(job: SandboxJobContext, language: ProgrammingLanguage): Promise<{
        output: string;
    }>;
    runScript(job: SandboxJobContext, scriptCode: string, inputJson: string): Promise<{
        output: string;
        stderr: string;
        exitCode: number;
    }>;
    runCase(job: SandboxJobContext, language: ProgrammingLanguage, input: string, limits: SandboxLimits, caseIndex: number): Promise<SandboxRunResult>;
    cleanupJob(job: SandboxJobContext): Promise<void>;
}
