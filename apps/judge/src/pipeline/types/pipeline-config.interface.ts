import { PipelineStageType, ProgrammingLanguage } from '@prisma/client';

/**
 * Pipeline 階段配置
 */
export interface PipelineStageConfig {
  type: PipelineStageType;
  config: Record<string, any>;
  enabled?: boolean;
}

/**
 * 編譯階段配置
 */
export interface CompileStageConfig {
  timeout?: number; // 編譯超時（毫秒）
  compilerFlags?: string; // 額外的編譯器參數，例如 "-O2 -Wall"
}

/**
 * 靜態分析階段配置
 */
export interface StaticAnalysisStageConfig {
  rules: StaticAnalysisRule[];
  failOnError?: boolean; // 是否在發現錯誤時直接失敗
}

export interface StaticAnalysisRule {
  type: 'forbidden-function' | 'forbidden-library' | 'forbidden-syntax' | 'linter';
  severity: 'error' | 'warning';
  config: Record<string, any>;
}

/**
 * 執行階段配置
 */
export interface ExecuteStageConfig {
  useTestdata?: boolean; // 是否使用測資（預設 true）
  customInputs?: string[]; // 自訂輸入（如果不使用測資）
  timeLimitMs?: number; // 時間限制
  memoryLimitKb?: number; // 記憶體限制
}

/**
 * 檢查階段配置
 */
export interface CheckStageConfig {
  mode: 'diff' | 'custom-checker'; // diff: 字串比對, custom-checker: 自訂檢查腳本
  checkerLanguage?: ProgrammingLanguage; // Checker 腳本語言
  checkerKey?: string; // Checker 在 MinIO 的路徑
  ignoreWhitespace?: boolean; // 是否忽略空白字元
  caseSensitive?: boolean; // 是否區分大小寫
}

/**
 * 計分階段配置
 */
export interface ScoringStageConfig {
  mode: 'sum' | 'weighted' | 'custom-script';
  weights?: Record<string, number>; // 各階段的權重
  scriptLanguage?: ProgrammingLanguage; // 計分腳本語言
  scriptKey?: string; // 計分腳本在 MinIO 的路徑
  penaltyRules?: ScoringPenaltyRule[]; // 懲罰規則
  subtaskWeights?: number[]; // 子任務權重列表
  defaultWeight?: number; // 預設權重
  normalizeToTotal?: number; // 標準化總分
}

export interface ScoringPenaltyRule {
  type: 'late-submission' | 'memory-usage' | 'time-usage';
  config: Record<string, any>;
}

/**
 * 網路配置
 */
export interface NetworkConfig {
  enabled: boolean;
  mode?: 'firewall' | 'sidecar';
  // Firewall 模式
  allowedDomains?: string[];
  allowedIPs?: string[];
  allowedPorts?: number[];
  // Sidecar 模式
  sidecarImage?: string;
  sidecarEnv?: Record<string, string>;
}

/**
 * 題目的完整 Pipeline 配置
 */
export interface ProblemPipelineConfig {
  stages: PipelineStageConfig[];
}
