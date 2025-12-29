import { PrismaService } from '../prisma/prisma.service';
import { PipelineRegistry } from './pipeline.registry';
import { PipelineContext } from './types/stage-context.interface';
import { PipelineExecutionResult } from './types/stage-result.interface';
import { ProblemPipelineConfig } from './types/pipeline-config.interface';
import { ArtifactsService } from './artifacts/artifacts.service';
export declare class PipelineExecutor {
    private readonly prisma;
    private readonly registry;
    private readonly artifactsService;
    private readonly logger;
    constructor(prisma: PrismaService, registry: PipelineRegistry, artifactsService: ArtifactsService);
    execute(pipelineContext: PipelineContext, pipelineConfig: ProblemPipelineConfig): Promise<PipelineExecutionResult>;
    private saveStageResult;
    private uploadArtifacts;
}
