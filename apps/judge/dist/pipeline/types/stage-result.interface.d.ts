import { SubmissionStatus } from '@prisma/client';
export interface StageResult {
    status: SubmissionStatus;
    timeMs?: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
    details?: Record<string, any>;
    shouldAbort?: boolean;
    message?: string;
}
export interface PipelineExecutionResult {
    finalStatus: SubmissionStatus;
    score?: number;
    rawScore?: number;
    stageResults: StageResult[];
    testCaseResults?: any[];
    compileLog?: string;
    summary?: Record<string, any>;
    artifactsKey?: string;
}
