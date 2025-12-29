import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';

/**
 * Pipeline Stage 抽象介面
 * 所有 Stage 都必須實作這個介面
 */
export interface PipelineStage {
  /**
   * Stage 名稱（用於日誌和除錯）
   */
  readonly name: string;

  /**
   * 執行 Stage
   * @param context Stage 執行上下文
   * @returns Stage 執行結果
   */
  execute(context: StageContext): Promise<StageResult>;

  /**
   * 驗證 Stage 配置是否有效（選用）
   * @param config Stage 配置
   * @returns 如果配置無效，回傳錯誤訊息；否則回傳 null
   */
  validateConfig?(config: Record<string, any>): string | null;

  /**
   * 清理 Stage 資源（選用）
   * 在 Stage 執行完畢後呼叫，用於清理暫存檔案等
   */
  cleanup?(context: StageContext): Promise<void>;
}
