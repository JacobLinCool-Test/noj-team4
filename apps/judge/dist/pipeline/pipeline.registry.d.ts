import { OnModuleInit } from '@nestjs/common';
import { PipelineStageType } from '@prisma/client';
import { PipelineStage } from './stages/pipeline-stage.interface';
import { CompileStage } from './stages/compile.stage';
import { ExecuteStage } from './stages/execute.stage';
import { CheckStage } from './stages/check.stage';
import { StaticAnalysisStage } from './stages/static-analysis.stage';
import { ScoringStage } from './stages/scoring.stage';
import { InteractiveStage } from './stages/interactive.stage';
export declare class PipelineRegistry implements OnModuleInit {
    private readonly compileStage;
    private readonly executeStage;
    private readonly checkStage;
    private readonly staticAnalysisStage;
    private readonly scoringStage;
    private readonly interactiveStage;
    private readonly logger;
    private readonly stages;
    constructor(compileStage: CompileStage, executeStage: ExecuteStage, checkStage: CheckStage, staticAnalysisStage: StaticAnalysisStage, scoringStage: ScoringStage, interactiveStage: InteractiveStage);
    onModuleInit(): void;
    registerStage(type: PipelineStageType, stage: PipelineStage): void;
    getStage(type: PipelineStageType): PipelineStage | undefined;
    hasStage(type: PipelineStageType): boolean;
    getAllStageTypes(): PipelineStageType[];
    validateStageConfig(type: PipelineStageType, config: Record<string, any>): string | null;
}
