import { SubmissionStatus, ProgrammingLanguage } from '@prisma/client';
export type SandboxLanguage = 'C' | 'CPP' | 'JAVA' | 'PYTHON';
export interface SandboxNetworkConfig {
    enabled: boolean;
    mode?: 'firewall' | 'sidecar';
    allowedDomains?: string[];
    allowedIPs?: string[];
    allowedPorts?: number[];
}
export interface SandboxLimits {
    timeLimitMs: number;
    memoryLimitKb: number;
    outputLimitBytes?: number;
    networkConfig?: SandboxNetworkConfig;
}
export interface SandboxJobContext {
    submissionId: string;
    jobDir: string;
}
export interface SandboxCompileResult {
    status: SubmissionStatus;
    log?: string;
}
export interface SandboxRunResult {
    status: SubmissionStatus;
    timeMs: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
}
export declare function toSandboxLanguage(language: ProgrammingLanguage): SandboxLanguage;
