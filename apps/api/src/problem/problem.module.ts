import { Module, forwardRef } from '@nestjs/common';
import { ProblemService } from './problem.service';
import { ProblemController } from './problem.controller';
import { PipelineProblemController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { MinioModule } from '../minio/minio.module';
import { TranslatorModule } from '../translator/translator.module';

@Module({
  imports: [MinioModule, forwardRef(() => TranslatorModule)],
  providers: [ProblemService, PipelineService],
  controllers: [ProblemController, PipelineProblemController],
  exports: [ProblemService, PipelineService],
})
export class ProblemModule {}
