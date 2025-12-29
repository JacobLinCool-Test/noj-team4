import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineRegistry } from './pipeline.registry';
import {
  PipelineContext,
  StageContext,
} from './types/stage-context.interface';
import {
  PipelineExecutionResult,
  StageResult,
} from './types/stage-result.interface';
import { ProblemPipelineConfig } from './types/pipeline-config.interface';
import { SubmissionStatus } from '@prisma/client';
import { ArtifactsService } from './artifacts/artifacts.service';

/**
 * Pipeline 執行器
 * 負責執行完整的評測 Pipeline
 */
@Injectable()
export class PipelineExecutor {
  private readonly logger = new Logger(PipelineExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PipelineRegistry,
    private readonly artifactsService: ArtifactsService,
  ) {}

  /**
   * 執行 Pipeline
   */
  async execute(
    pipelineContext: PipelineContext,
    pipelineConfig: ProblemPipelineConfig,
  ): Promise<PipelineExecutionResult> {
    const { submissionId } = pipelineContext;

    this.logger.log(
      `[${submissionId}] 開始執行 Pipeline (共 ${pipelineConfig.stages.length} 個階段)`,
    );

    const stageResults: StageResult[] = [];
    let currentStatus: SubmissionStatus = SubmissionStatus.PENDING;
    let shouldAbort = false;

    // 初始化 stageData
    if (!pipelineContext.stageData) {
      pipelineContext.stageData = new Map();
    }

    // 依序執行各個階段
    for (let i = 0; i < pipelineConfig.stages.length; i++) {
      const stageConfig = pipelineConfig.stages[i];

      // 檢查是否跳過此階段
      if (stageConfig.enabled === false) {
        this.logger.debug(
          `[${submissionId}] 跳過階段 ${i + 1}: ${stageConfig.type} (已停用)`,
        );
        continue;
      }

      // 如果前一階段要求中止，則停止執行
      if (shouldAbort) {
        this.logger.warn(
          `[${submissionId}] 前一階段要求中止，停止執行後續階段`,
        );
        break;
      }

      // 取得 Stage 實作
      const stage = this.registry.getStage(stageConfig.type);
      if (!stage) {
        this.logger.error(
          `[${submissionId}] Stage ${stageConfig.type} 未註冊`,
        );
        stageResults.push({
          status: SubmissionStatus.JUDGE_ERROR,
          stderr: `Stage ${stageConfig.type} 未註冊`,
          shouldAbort: true,
          message: '評測系統錯誤',
        });
        currentStatus = SubmissionStatus.JUDGE_ERROR;
        shouldAbort = true;
        break;
      }

      // 驗證 Stage 配置
      const configError = this.registry.validateStageConfig(
        stageConfig.type,
        stageConfig.config,
      );
      if (configError) {
        this.logger.error(
          `[${submissionId}] Stage ${stageConfig.type} 配置錯誤: ${configError}`,
        );
        stageResults.push({
          status: SubmissionStatus.JUDGE_ERROR,
          stderr: `配置錯誤: ${configError}`,
          shouldAbort: true,
          message: '評測系統錯誤',
        });
        currentStatus = SubmissionStatus.JUDGE_ERROR;
        shouldAbort = true;
        break;
      }

      // 執行 Stage
      this.logger.log(
        `[${submissionId}] 執行階段 ${i + 1}/${pipelineConfig.stages.length}: ${stageConfig.type}`,
      );

      const stageContext: StageContext = {
        pipeline: pipelineContext,
        stageConfig: stageConfig.config,
        stageOrder: i,
      };

      try {
        const startTime = Date.now();
        const result = await stage.execute(stageContext);
        const duration = Date.now() - startTime;

        this.logger.log(
          `[${submissionId}] 階段 ${i + 1} 完成: ${stageConfig.type} (狀態: ${result.status}, 耗時: ${duration}ms)`,
        );

        stageResults.push(result);

        // 儲存階段結果到資料庫
        await this.saveStageResult(submissionId, stageConfig.type, i, result);

        // 更新當前狀態
        if (result.status !== SubmissionStatus.AC) {
          currentStatus = result.status;
        }

        // 檢查是否應該中止
        if (result.shouldAbort) {
          shouldAbort = true;
        }

        // 清理 Stage 資源
        if (stage.cleanup) {
          await stage.cleanup(stageContext);
        }
      } catch (error) {
        this.logger.error(
          `[${submissionId}] 階段 ${stageConfig.type} 執行失敗: ${error.message}`,
          error.stack,
        );

        const errorResult: StageResult = {
          status: SubmissionStatus.JUDGE_ERROR,
          stderr: error.message,
          shouldAbort: true,
          message: '評測系統錯誤',
        };

        stageResults.push(errorResult);
        await this.saveStageResult(
          submissionId,
          stageConfig.type,
          i,
          errorResult,
        );

        currentStatus = SubmissionStatus.JUDGE_ERROR;
        shouldAbort = true;
        break;
      }
    }

    // 計算最終分數
    const rawScore = pipelineContext.stageData.get('rawScore') || 0;
    const finalScore = pipelineContext.stageData.get('finalScore') || rawScore;

    // 如果所有階段都成功，且沒有明確設定狀態，則設為 AC
    // 注意：RUNNING 也視為待決定狀態（表示執行成功但尚未確定最終結果）
    if (
      (currentStatus === SubmissionStatus.PENDING ||
        currentStatus === SubmissionStatus.RUNNING) &&
      stageResults.every((r) => r.status === SubmissionStatus.AC)
    ) {
      currentStatus = SubmissionStatus.AC;
    }

    // 收集測試案例結果
    const testCaseResults = pipelineContext.testCaseResults || [];

    // 收集產物（如果有配置）
    let artifactsKey: string | undefined;
    if (pipelineContext.artifactPaths && pipelineContext.artifactPaths.length > 0) {
      try {
        const artifacts = await this.artifactsService.collectArtifacts(
          pipelineContext.jobDir,
          pipelineContext.artifactPaths,
        );
        if (artifacts.size > 0) {
          artifactsKey = await this.artifactsService.uploadArtifacts(
            submissionId,
            artifacts,
          );
        }
      } catch (error) {
        this.logger.warn(
          `[${submissionId}] 收集產物失敗: ${error.message}`,
        );
      }
    }

    // 構建執行結果
    const executionResult: PipelineExecutionResult = {
      finalStatus: currentStatus,
      score: finalScore,
      rawScore,
      stageResults,
      testCaseResults,
      compileLog: pipelineContext.compileLog,
      summary: {
        totalStages: pipelineConfig.stages.length,
        completedStages: stageResults.length,
        aborted: shouldAbort,
      },
      artifactsKey,
    };

    this.logger.log(
      `[${submissionId}] Pipeline 執行完成 (最終狀態: ${currentStatus}, 分數: ${finalScore})`,
    );

    return executionResult;
  }

  /**
   * 儲存階段結果到資料庫
   */
  private async saveStageResult(
    submissionId: string,
    stageType: any,
    order: number,
    result: StageResult,
  ): Promise<void> {
    try {
      await this.prisma.pipelineStageResult.create({
        data: {
          submissionId,
          stageType,
          order,
          status: result.status,
          timeMs: result.timeMs,
          memoryKb: result.memoryKb,
          stdoutTrunc: result.stdout?.substring(0, 10000),
          stderrTrunc: result.stderr?.substring(0, 10000),
          details: result.details || {},
        },
      });
    } catch (error) {
      this.logger.error(
        `[${submissionId}] 儲存階段結果失敗: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 上傳產物到 MinIO
   */
  private async uploadArtifacts(
    submissionId: string,
    artifacts: Map<string, Buffer>,
  ): Promise<string | undefined> {
    if (!artifacts || artifacts.size === 0) {
      return undefined;
    }

    try {
      return await this.artifactsService.uploadArtifacts(
        submissionId,
        artifacts,
      );
    } catch (error) {
      this.logger.error(
        `[${submissionId}] 上傳產物失敗: ${error.message}`,
        error.stack,
      );
      return undefined;
    }
  }
}
