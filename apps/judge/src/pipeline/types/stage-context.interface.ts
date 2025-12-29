import { ProgrammingLanguage, SubmissionType } from '@prisma/client';
import { TestdataManifest } from '../../testdata/testdata.types';

/**
 * Pipeline 執行上下文
 * 在各個 Stage 之間傳遞資料
 */
export interface PipelineContext {
  // 提交資訊
  submissionId: string;
  userId: number;
  problemId: string;
  language: ProgrammingLanguage;
  submissionType: SubmissionType;

  // 工作目錄
  jobDir: string;
  srcDir: string;
  buildDir: string;
  testdataDir: string;
  outDir: string;

  // 原始碼資訊
  sourceCode?: string; // 單一檔案
  sourceKey: string; // MinIO 路徑

  // 測資資訊
  testdataManifest?: TestdataManifest;
  testdataVersion: number;

  // 範例測資（作為 testdata 的備用方案）
  sampleCases?: { input: string; output: string }[];

  // 題目設定
  checkerKey?: string;
  checkerLanguage?: ProgrammingLanguage;
  templateKey?: string;
  makefileKey?: string; // 老師提供的 Makefile（用於 MULTI_FILE 類型）
  artifactPaths: string[];
  networkConfig?: any;

  // 編譯結果
  compiled?: boolean;
  compileLog?: string;
  executablePath?: string;

  // 執行結果
  testCaseResults?: TestCaseResult[];

  // 各階段的輸出資料（供後續階段使用）
  stageData: Map<string, any>;

  // 收集的產物
  artifacts?: Map<string, Buffer>;
}

/**
 * 測試案例執行結果
 */
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

/**
 * Stage 執行上下文（包含 Pipeline 上下文和當前階段配置）
 */
export interface StageContext {
  pipeline: PipelineContext;
  stageConfig: Record<string, any>;
  stageOrder: number;
}
