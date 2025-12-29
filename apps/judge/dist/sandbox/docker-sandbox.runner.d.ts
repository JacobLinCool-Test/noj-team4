import { ProgrammingLanguage } from '@prisma/client';
import { SandboxCompileResult, SandboxJobContext, SandboxLimits, SandboxRunResult } from './sandbox.types';
import { SandboxRunner, CompileOptions } from './sandbox.runner';
import { SandboxConfig } from './sandbox.config';
export declare class DockerSandboxRunner implements SandboxRunner {
    private readonly config;
    private readonly logger;
    constructor(config: SandboxConfig);
    createJob(submissionId: string): Promise<SandboxJobContext>;
    writeSource(job: SandboxJobContext, language: ProgrammingLanguage, sourceCode: string): Promise<void>;
    compile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<SandboxCompileResult>;
    compileWithMakefile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<SandboxCompileResult>;
    lint(job: SandboxJobContext, language: ProgrammingLanguage): Promise<{
        output: string;
    }>;
    runScript(job: SandboxJobContext, scriptCode: string, inputJson: string): Promise<{
        output: string;
        stderr: string;
        exitCode: number;
    }>;
    runCase(job: SandboxJobContext, language: ProgrammingLanguage, input: string, limits: SandboxLimits, caseIndex: number): Promise<SandboxRunResult>;
    private getNetworkMode;
    cleanupJob(job: SandboxJobContext): Promise<void>;
    private classifyNonZeroExit;
    private safeReadText;
    private getSourceFileName;
    private makeContainerName;
    private execDockerRun;
    private execDockerRmForce;
}
