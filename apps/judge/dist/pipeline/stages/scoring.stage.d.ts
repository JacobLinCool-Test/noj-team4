import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { MinioService } from '../../minio/minio.service';
export declare class ScoringStage implements PipelineStage {
    private readonly sandbox;
    private readonly minio;
    private readonly logger;
    readonly name = "Scoring";
    constructor(sandbox: SandboxRunner, minio: MinioService);
    execute(context: StageContext): Promise<StageResult>;
    private calculateSumScore;
    private calculateWeightedScore;
    private runCustomScoringScript;
    private applyPenalties;
    private calculatePenalty;
    private calculateLateSubmissionPenalty;
    private calculateMemoryUsagePenalty;
    private calculateTimeUsagePenalty;
    validateConfig(config: Record<string, any>): string | null;
}
