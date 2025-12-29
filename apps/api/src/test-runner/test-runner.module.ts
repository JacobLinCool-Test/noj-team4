import { Module } from '@nestjs/common';
import { TestRunnerService } from './test-runner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemModule } from '../problem/problem.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [PrismaModule, ProblemModule, MinioModule],
  providers: [TestRunnerService],
  exports: [TestRunnerService],
})
export class TestRunnerModule {}
