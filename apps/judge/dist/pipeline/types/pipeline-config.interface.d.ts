import { PipelineStageType, ProgrammingLanguage } from '@prisma/client';
export interface PipelineStageConfig {
    type: PipelineStageType;
    config: Record<string, any>;
    enabled?: boolean;
}
export interface CompileStageConfig {
    timeout?: number;
    compilerFlags?: string;
}
export interface StaticAnalysisStageConfig {
    rules: StaticAnalysisRule[];
    failOnError?: boolean;
}
export interface StaticAnalysisRule {
    type: 'forbidden-function' | 'forbidden-library' | 'forbidden-syntax' | 'linter';
    severity: 'error' | 'warning';
    config: Record<string, any>;
}
export interface ExecuteStageConfig {
    useTestdata?: boolean;
    customInputs?: string[];
    timeLimitMs?: number;
    memoryLimitKb?: number;
}
export interface CheckStageConfig {
    mode: 'diff' | 'custom-checker';
    checkerLanguage?: ProgrammingLanguage;
    checkerKey?: string;
    ignoreWhitespace?: boolean;
    caseSensitive?: boolean;
}
export interface ScoringStageConfig {
    mode: 'sum' | 'weighted' | 'custom-script';
    weights?: Record<string, number>;
    scriptLanguage?: ProgrammingLanguage;
    scriptKey?: string;
    penaltyRules?: ScoringPenaltyRule[];
    subtaskWeights?: number[];
    defaultWeight?: number;
    normalizeToTotal?: number;
}
export interface ScoringPenaltyRule {
    type: 'late-submission' | 'memory-usage' | 'time-usage';
    config: Record<string, any>;
}
export interface NetworkConfig {
    enabled: boolean;
    mode?: 'firewall' | 'sidecar';
    allowedDomains?: string[];
    allowedIPs?: string[];
    allowedPorts?: number[];
    sidecarImage?: string;
    sidecarEnv?: Record<string, string>;
}
export interface ProblemPipelineConfig {
    stages: PipelineStageConfig[];
}
