import { SubmissionStatus } from '@prisma/client';

/**
 * Pipeline Stage 執行結果
 */
export interface StageResult {
  // 狀態
  status: SubmissionStatus;

  // 執行時間和資源使用
  timeMs?: number;
  memoryKb?: number;

  // 輸出
  stdout?: string;
  stderr?: string;

  // 詳細資訊（會儲存到資料庫的 details 欄位）
  details?: Record<string, any>;

  // 是否應該中止後續階段
  shouldAbort?: boolean;

  // 訊息（用於顯示給用戶）
  message?: string;
}

/**
 * Pipeline 執行結果
 */
export interface PipelineExecutionResult {
  // 最終狀態
  finalStatus: SubmissionStatus;

  // 最終分數
  score?: number;
  rawScore?: number;

  // 各階段結果
  stageResults: StageResult[];

  // 測試案例結果
  testCaseResults?: any[];

  // 編譯日誌
  compileLog?: string;

  // 摘要資訊
  summary?: Record<string, any>;

  // 產物 ZIP 的 MinIO 路徑
  artifactsKey?: string;
}
