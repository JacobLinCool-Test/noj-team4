import { Module } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import {
  SubmissionController,
  SubmissionsController,
} from './submission.controller';
import { ArtifactsController } from './artifacts.controller';
import { TestRunnerModule } from '../test-runner/test-runner.module';
import { MinioModule } from '../minio/minio.module';
import { AuthModule } from '../auth/auth.module';
import { CodeSafetyModule } from '../code-safety/code-safety.module';

@Module({
  imports: [TestRunnerModule, MinioModule, AuthModule, CodeSafetyModule],
  controllers: [
    SubmissionController,
    SubmissionsController,
    ArtifactsController,
  ],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
