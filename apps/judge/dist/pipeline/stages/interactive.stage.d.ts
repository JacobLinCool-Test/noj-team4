import { ProgrammingLanguage } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { MinioService } from '../../minio/minio.service';
export interface InteractiveStageConfig {
    interactorKey: string;
    interactorLanguage: ProgrammingLanguage;
    timeLimitMs?: number;
    memoryLimitKb?: number;
    interactionTimeoutMs?: number;
}
export declare class InteractiveStage implements PipelineStage {
    private readonly sandbox;
    private readonly minio;
    private readonly logger;
    readonly name = "Interactive";
    constructor(sandbox: SandboxRunner, minio: MinioService);
    execute(context: StageContext): Promise<StageResult>;
    private prepareInteractor;
    private compileInteractor;
    private prepareTestCases;
    private loadTestdataCases;
    private runInteractiveCase;
    private generateInteractiveWrapperScript;
    private getStudentCommand;
    private getInteractorCommand;
    private parseInteractorResult;
    private determineOverallStatus;
    private getSourceFileName;
    private needsCompilation;
    validateConfig(config: Record<string, any>): string | null;
}
