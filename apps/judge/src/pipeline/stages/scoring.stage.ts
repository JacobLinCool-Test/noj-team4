import { Injectable, Logger, Inject } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { ScoringStageConfig } from '../types/pipeline-config.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { MinioService } from '../../minio/minio.service';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 計分階段
 * 負責根據測試結果計算最終分數
 * 支援多種計分模式：
 * 1. sum: 累加各測試案例分數
 * 2. weighted: 加權計分
 * 3. custom-script: 自訂計分腳本
 */
@Injectable()
export class ScoringStage implements PipelineStage {
  private readonly logger = new Logger(ScoringStage.name);
  readonly name = 'Scoring';

  constructor(
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
    private readonly minio: MinioService,
  ) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as ScoringStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始計分階段 (模式: ${config.mode})`,
    );

    try {
      let rawScore = 0;
      let finalScore = 0;

      // 計算原始分數
      switch (config.mode) {
        case 'sum':
          rawScore = this.calculateSumScore(pipeline);
          break;
        case 'weighted':
          rawScore = this.calculateWeightedScore(pipeline, config);
          break;
        case 'custom-script':
          rawScore = await this.runCustomScoringScript(pipeline, config);
          break;
        default:
          rawScore = this.calculateSumScore(pipeline);
      }

      // 應用懲罰規則
      finalScore = rawScore;
      if (config.penaltyRules && config.penaltyRules.length > 0) {
        finalScore = await this.applyPenalties(
          rawScore,
          config.penaltyRules,
          pipeline,
        );
      }

      // 儲存分數到 pipeline
      pipeline.stageData.set('rawScore', rawScore);
      pipeline.stageData.set('finalScore', finalScore);

      this.logger.log(
        `[${pipeline.submissionId}] 計分完成 (原始分數: ${rawScore}, 最終分數: ${finalScore})`,
      );

      return {
        status: SubmissionStatus.AC,
        details: {
          rawScore,
          finalScore,
          penaltyApplied: rawScore !== finalScore,
        },
        message: `計分完成 (${finalScore} 分)`,
      };
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 計分階段發生錯誤: ${error.message}`,
        error.stack,
      );
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: error.message,
        shouldAbort: true,
        message: '評測系統錯誤',
      };
    }
  }

  /**
   * 累加計分
   */
  private calculateSumScore(pipeline: any): number {
    const { testCaseResults } = pipeline;
    if (!testCaseResults || testCaseResults.length === 0) {
      return 0;
    }

    let totalScore = 0;
    for (const result of testCaseResults) {
      if (result.status === SubmissionStatus.AC && result.points) {
        totalScore += result.points;
      }
    }

    return totalScore;
  }

  /**
   * 加權計分
   */
  private calculateWeightedScore(
    pipeline: any,
    config: ScoringStageConfig,
  ): number {
    const { testCaseResults } = pipeline;
    if (!testCaseResults || testCaseResults.length === 0) {
      return 0;
    }

    // 取得權重配置
    const weights = config.weights || {};
    const subtaskWeights = config.subtaskWeights || [];
    const defaultWeight = config.defaultWeight || 1;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // 按子任務分組計分
    if (subtaskWeights.length > 0) {
      // 將測試案例按子任務分組
      const subtaskGroups: Map<number, any[]> = new Map();
      for (const result of testCaseResults) {
        const subtaskId = result.subtaskId || 0;
        if (!subtaskGroups.has(subtaskId)) {
          subtaskGroups.set(subtaskId, []);
        }
        subtaskGroups.get(subtaskId)!.push(result);
      }

      // 計算每個子任務的分數
      for (let i = 0; i < subtaskWeights.length; i++) {
        const subtaskWeight = subtaskWeights[i];
        const subtaskCases = subtaskGroups.get(i) || [];

        if (subtaskCases.length === 0) continue;

        // 子任務內所有測試案例都必須通過才得分
        const allPassed = subtaskCases.every(
          (r) => r.status === SubmissionStatus.AC,
        );

        if (allPassed) {
          totalWeightedScore += subtaskWeight || 0;
        }
        totalWeight += subtaskWeight || 0;
      }
    } else {
      // 按個別測試案例加權計分
      for (const result of testCaseResults) {
        const caseName = result.name || `case-${result.caseNo}`;
        const weight = weights[caseName] || defaultWeight;

        if (result.status === SubmissionStatus.AC) {
          totalWeightedScore += (result.points || 0) * weight;
        }
        totalWeight += (result.points || 0) * weight;
      }
    }

    // 正規化分數（如果需要）
    if (config.normalizeToTotal && totalWeight > 0) {
      const normalizedScore =
        (totalWeightedScore / totalWeight) * config.normalizeToTotal;
      return Math.round(normalizedScore * 100) / 100;
    }

    return totalWeightedScore;
  }

  /**
   * 執行自訂計分腳本
   */
  private async runCustomScoringScript(
    pipeline: any,
    config: ScoringStageConfig,
  ): Promise<number> {
    if (!config.scriptKey) {
      this.logger.warn(
        `[${pipeline.submissionId}] 未提供 scriptKey，使用累加計分`,
      );
      return this.calculateSumScore(pipeline);
    }

    try {
      // 1. 從 MinIO 下載計分腳本
      const scriptCode = await this.minio.getObjectAsString(
        'noj-problems',
        config.scriptKey,
      );

      // 2. 準備輸入資料
      const inputData = {
        submissionId: pipeline.submissionId,
        problemId: pipeline.problemId,
        language: pipeline.language,
        testCaseResults: pipeline.testCaseResults || [],
        submittedAt: new Date().toISOString(),
        totalPoints: (pipeline.testCaseResults || []).reduce(
          (sum: number, r: any) => sum + (r.points || 0),
          0,
        ),
      };

      // 3. 在沙箱中執行腳本
      const result = await this.sandbox.runScript(
        {
          submissionId: pipeline.submissionId,
          jobDir: pipeline.jobDir,
        },
        scriptCode,
        JSON.stringify(inputData),
      );

      // 4. 解析腳本輸出的分數
      if (result.exitCode !== 0) {
        this.logger.warn(
          `[${pipeline.submissionId}] 計分腳本執行失敗 (exitCode: ${result.exitCode}): ${result.stderr}`,
        );
        return this.calculateSumScore(pipeline);
      }

      // 嘗試解析輸出為 JSON
      try {
        const outputData = JSON.parse(result.output);
        if (typeof outputData.score === 'number') {
          return outputData.score;
        }
        if (typeof outputData === 'number') {
          return outputData;
        }
        this.logger.warn(
          `[${pipeline.submissionId}] 計分腳本輸出格式無效，使用累加計分`,
        );
        return this.calculateSumScore(pipeline);
      } catch (parseError) {
        // 如果不是 JSON，嘗試直接解析為數字
        const score = parseFloat(result.output.trim());
        if (!isNaN(score)) {
          return score;
        }
        this.logger.warn(
          `[${pipeline.submissionId}] 無法解析計分腳本輸出: ${result.output}`,
        );
        return this.calculateSumScore(pipeline);
      }
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 自訂計分腳本執行錯誤: ${error.message}`,
      );
      return this.calculateSumScore(pipeline);
    }
  }

  /**
   * 應用懲罰規則
   */
  private async applyPenalties(
    rawScore: number,
    rules: any[],
    pipeline: any,
  ): Promise<number> {
    let finalScore = rawScore;

    for (const rule of rules) {
      const penalty = await this.calculatePenalty(rule, pipeline);
      finalScore = Math.max(0, finalScore - penalty);

      this.logger.debug(
        `[${pipeline.submissionId}] 應用懲罰規則 ${rule.type}: -${penalty} 分`,
      );
    }

    return finalScore;
  }

  /**
   * 計算單一懲罰規則的懲罰分數
   */
  private async calculatePenalty(rule: any, pipeline: any): Promise<number> {
    switch (rule.type) {
      case 'late-submission':
        return this.calculateLateSubmissionPenalty(rule.config, pipeline);
      case 'memory-usage':
        return this.calculateMemoryUsagePenalty(rule.config, pipeline);
      case 'time-usage':
        return this.calculateTimeUsagePenalty(rule.config, pipeline);
      default:
        this.logger.warn(`未知的懲罰規則類型: ${rule.type}`);
        return 0;
    }
  }

  /**
   * 計算遲交懲罰
   */
  private calculateLateSubmissionPenalty(
    config: any,
    pipeline: any,
  ): number {
    // 從 pipeline 獲取截止時間和提交時間
    const deadline = pipeline.stageData.get('deadline');
    const submittedAt = pipeline.stageData.get('submittedAt');

    if (!deadline || !submittedAt) {
      // 沒有截止時間資訊，不計算懲罰
      return 0;
    }

    const deadlineDate = new Date(deadline);
    const submittedDate = new Date(submittedAt);

    // 如果在截止時間前提交，不懲罰
    if (submittedDate <= deadlineDate) {
      return 0;
    }

    // 計算遲交時間（毫秒）
    const lateMs = submittedDate.getTime() - deadlineDate.getTime();
    const lateDays = lateMs / (1000 * 60 * 60 * 24);

    // 懲罰模式
    const penaltyMode = config.mode || 'per-day';
    const penaltyRate = config.rate || 10; // 預設每日扣 10 分
    const maxPenalty = config.maxPenalty || 100; // 最大懲罰分數
    const gracePeriodHours = config.gracePeriodHours || 0; // 寬限期（小時）

    // 扣除寬限期
    const effectiveLateHours = Math.max(0, (lateMs / (1000 * 60 * 60)) - gracePeriodHours);
    const effectiveLateDays = effectiveLateHours / 24;

    let penalty = 0;

    switch (penaltyMode) {
      case 'per-day':
        // 每日扣固定分數
        penalty = Math.ceil(effectiveLateDays) * penaltyRate;
        break;
      case 'per-hour':
        // 每小時扣固定分數
        penalty = Math.ceil(effectiveLateHours) * penaltyRate;
        break;
      case 'percentage-per-day':
        // 每日扣一定百分比
        penalty = Math.ceil(effectiveLateDays) * penaltyRate;
        break;
      case 'exponential':
        // 指數遞增懲罰
        penalty = Math.pow(2, effectiveLateDays) * penaltyRate;
        break;
      default:
        penalty = Math.ceil(effectiveLateDays) * penaltyRate;
    }

    // 不超過最大懲罰
    penalty = Math.min(penalty, maxPenalty);

    this.logger.debug(
      `[${pipeline.submissionId}] 遲交懲罰: ${penalty} 分 (遲交 ${lateDays.toFixed(2)} 天)`,
    );

    return penalty;
  }

  /**
   * 計算記憶體用量懲罰
   */
  private calculateMemoryUsagePenalty(config: any, pipeline: any): number {
    const { testCaseResults } = pipeline;
    if (!testCaseResults || testCaseResults.length === 0) {
      return 0;
    }

    // 找出最大記憶體用量
    const maxMemoryKb = Math.max(
      ...testCaseResults.map((r) => r.memoryKb || 0),
    );
    const maxMemoryMb = maxMemoryKb / 1024;

    // 範例：記憶體用量超過閾值時開始懲罰
    const threshold = config.thresholdMb || 64;
    const penaltyRate = config.penaltyRate || 1; // 每 MB 扣多少分

    if (maxMemoryMb > threshold) {
      return (maxMemoryMb - threshold) * penaltyRate;
    }

    return 0;
  }

  /**
   * 計算時間用量懲罰
   */
  private calculateTimeUsagePenalty(config: any, pipeline: any): number {
    const { testCaseResults } = pipeline;
    if (!testCaseResults || testCaseResults.length === 0) {
      return 0;
    }

    // 計算總執行時間
    const totalTimeMs = testCaseResults.reduce(
      (sum, r) => sum + (r.timeMs || 0),
      0,
    );

    // 範例：執行時間超過閾值時開始懲罰
    const thresholdMs = config.thresholdMs || 10000;
    const penaltyRate = config.penaltyRate || 0.01; // 每毫秒扣多少分

    if (totalTimeMs > thresholdMs) {
      return (totalTimeMs - thresholdMs) * penaltyRate;
    }

    return 0;
  }

  validateConfig(config: Record<string, any>): string | null {
    const cfg = config as ScoringStageConfig;
    if (!cfg.mode) {
      return '必須指定 mode (sum, weighted, 或 custom-script)';
    }
    if (cfg.mode === 'custom-script' && !cfg.scriptKey) {
      return 'custom-script 模式必須提供 scriptKey';
    }
    return null;
  }
}
