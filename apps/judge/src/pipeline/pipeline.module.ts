import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SandboxModule } from '../sandbox/sandbox.module';
import { MinioModule } from '../minio/minio.module';
import { PipelineExecutor } from './pipeline.executor';
import { PipelineRegistry } from './pipeline.registry';

// Services
import { CheckerService } from './checker/checker.service';
import { TemplateService } from './template/template.service';
import { ArtifactsService } from './artifacts/artifacts.service';

// Stages
import { CompileStage } from './stages/compile.stage';
import { ExecuteStage } from './stages/execute.stage';
import { CheckStage } from './stages/check.stage';
import { StaticAnalysisStage } from './stages/static-analysis.stage';
import { ScoringStage } from './stages/scoring.stage';
import { InteractiveStage } from './stages/interactive.stage';

@Module({
  imports: [PrismaModule, SandboxModule, MinioModule],
  providers: [
    // Services
    CheckerService,
    TemplateService,
    ArtifactsService,

    // Registry
    PipelineRegistry,

    // Executor
    PipelineExecutor,

    // Stages
    CompileStage,
    ExecuteStage,
    CheckStage,
    StaticAnalysisStage,
    ScoringStage,
    InteractiveStage,
  ],
  exports: [PipelineExecutor, PipelineRegistry, ArtifactsService],
})
export class PipelineModule {}
