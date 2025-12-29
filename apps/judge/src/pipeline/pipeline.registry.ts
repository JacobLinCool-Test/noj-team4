import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PipelineStageType } from '@prisma/client';
import { PipelineStage } from './stages/pipeline-stage.interface';
import { CompileStage } from './stages/compile.stage';
import { ExecuteStage } from './stages/execute.stage';
import { CheckStage } from './stages/check.stage';
import { StaticAnalysisStage } from './stages/static-analysis.stage';
import { ScoringStage } from './stages/scoring.stage';
import { InteractiveStage } from './stages/interactive.stage';

/**
 * Pipeline Stage 註冊表
 * 負責管理所有可用的 Stage 實作
 */
@Injectable()
export class PipelineRegistry implements OnModuleInit {
  private readonly logger = new Logger(PipelineRegistry.name);
  private readonly stages = new Map<PipelineStageType, PipelineStage>();

  constructor(
    private readonly compileStage: CompileStage,
    private readonly executeStage: ExecuteStage,
    private readonly checkStage: CheckStage,
    private readonly staticAnalysisStage: StaticAnalysisStage,
    private readonly scoringStage: ScoringStage,
    private readonly interactiveStage: InteractiveStage,
  ) {}

  onModuleInit() {
    // 註冊所有內建 Stage
    this.registerStage(PipelineStageType.COMPILE, this.compileStage);
    this.registerStage(PipelineStageType.EXECUTE, this.executeStage);
    this.registerStage(PipelineStageType.CHECK, this.checkStage);
    this.registerStage(
      PipelineStageType.STATIC_ANALYSIS,
      this.staticAnalysisStage,
    );
    this.registerStage(PipelineStageType.SCORING, this.scoringStage);
    this.registerStage(PipelineStageType.INTERACTIVE, this.interactiveStage);

    this.logger.log(
      `Pipeline Registry 初始化完成，已註冊 ${this.stages.size} 個 Stage`,
    );
  }

  /**
   * 註冊 Stage
   */
  registerStage(type: PipelineStageType, stage: PipelineStage): void {
    if (this.stages.has(type)) {
      this.logger.warn(`Stage ${type} 已經註冊，將被覆蓋`);
    }
    this.stages.set(type, stage);
    this.logger.debug(`註冊 Stage: ${type} (${stage.name})`);
  }

  /**
   * 取得 Stage
   */
  getStage(type: PipelineStageType): PipelineStage | undefined {
    return this.stages.get(type);
  }

  /**
   * 檢查 Stage 是否已註冊
   */
  hasStage(type: PipelineStageType): boolean {
    return this.stages.has(type);
  }

  /**
   * 取得所有已註冊的 Stage 類型
   */
  getAllStageTypes(): PipelineStageType[] {
    return Array.from(this.stages.keys());
  }

  /**
   * 驗證 Stage 配置
   */
  validateStageConfig(
    type: PipelineStageType,
    config: Record<string, any>,
  ): string | null {
    const stage = this.getStage(type);
    if (!stage) {
      return `Stage ${type} 未註冊`;
    }

    if (stage.validateConfig) {
      return stage.validateConfig(config);
    }

    return null;
  }
}
