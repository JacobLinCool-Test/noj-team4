import { Module } from '@nestjs/common';
import { AiProblemCreatorController } from './ai-problem-creator.controller';
import { AiProblemCreatorService } from './ai-problem-creator.service';
import { SolutionExecutorService } from './solution-executor.service';
import { TestdataPackagerService } from './testdata-packager.service';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';
import { ProblemModule } from '../problem/problem.module';
import { MinioModule } from '../minio/minio.module';
import { TranslatorModule } from '../translator/translator.module';

@Module({
  imports: [AiAssistantModule, ProblemModule, MinioModule, TranslatorModule],
  controllers: [AiProblemCreatorController],
  providers: [
    AiProblemCreatorService,
    SolutionExecutorService,
    TestdataPackagerService,
  ],
  exports: [AiProblemCreatorService, SolutionExecutorService, TestdataPackagerService],
})
export class AiProblemCreatorModule {}
