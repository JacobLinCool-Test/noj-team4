import { ProgrammingLanguage, SubmissionType } from '@prisma/client';
import { TestdataManifest } from '../../testdata/testdata.types';
export interface PipelineContext {
    submissionId: string;
    userId: number;
    problemId: string;
    language: ProgrammingLanguage;
    submissionType: SubmissionType;
    jobDir: string;
    srcDir: string;
    buildDir: string;
    testdataDir: string;
    outDir: string;
    sourceCode?: string;
    sourceKey: string;
    testdataManifest?: TestdataManifest;
    testdataVersion: number;
    sampleCases?: {
        input: string;
        output: string;
    }[];
    checkerKey?: string;
    checkerLanguage?: ProgrammingLanguage;
    templateKey?: string;
    makefileKey?: string;
    artifactPaths: string[];
    networkConfig?: any;
    compiled?: boolean;
    compileLog?: string;
    executablePath?: string;
    testCaseResults?: TestCaseResult[];
    stageData: Map<string, any>;
    artifacts?: Map<string, Buffer>;
}
export interface TestCaseResult {
    caseNo: number;
    name: string;
    isSample: boolean;
    status: string;
    timeMs?: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
    points?: number;
    inputFile?: string;
    outputFile?: string;
    expectedOutput?: string;
}
export interface StageContext {
    pipeline: PipelineContext;
    stageConfig: Record<string, any>;
    stageOrder: number;
}
