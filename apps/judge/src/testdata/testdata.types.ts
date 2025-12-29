/**
 * 測試案例定義
 */
export interface TestdataCase {
  name: string;
  inputFile: string;
  outputFile: string;
  points: number;
  isSample: boolean;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

/**
 * Chaos 檔案配置
 * 用於防止作弊行為（如讀取固定檔名、假設目錄乾淨等投機解法）
 */
export interface ChaosConfig {
  /**
   * 是否啟用 chaos 機制
   */
  enabled: boolean;
  /**
   * 要注入到工作目錄的檔案列表
   * 這些檔案會從 testdata/chaos/ 目錄複製到 src/ 目錄
   */
  files?: string[];
  /**
   * 在特定測試案例執行前注入
   * 預設在第一個測試案例執行前注入
   */
  injectBeforeCase?: number;
}

/**
 * 測資清單
 */
export interface TestdataManifest {
  version: string;
  cases: TestdataCase[];
  defaultTimeLimitMs: number;
  defaultMemoryLimitKb: number;
  /**
   * Chaos 防作弊配置
   * 可以在測資 ZIP 中包含 chaos/ 目錄，這些檔案會被注入到工作目錄
   */
  chaos?: ChaosConfig;
}
