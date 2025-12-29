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

export function toSandboxLanguage(language: ProgrammingLanguage): SandboxLanguage {
  switch (language) {
    case ProgrammingLanguage.C:
      return 'C';
    case ProgrammingLanguage.CPP:
      return 'CPP';
    case ProgrammingLanguage.JAVA:
      return 'JAVA';
    case ProgrammingLanguage.PYTHON:
      return 'PYTHON';
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}
