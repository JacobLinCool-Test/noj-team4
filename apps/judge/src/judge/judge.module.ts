import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JudgeProcessor } from './judge.processor';
import { SandboxModule } from '../sandbox/sandbox.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'judge-submission',
    }),
    PrismaModule,
    MinioModule,
    SandboxModule,
    PipelineModule,
  ],
  providers: [JudgeProcessor],
})
export class JudgeModule {}
