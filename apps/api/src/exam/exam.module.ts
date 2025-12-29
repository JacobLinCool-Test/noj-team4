import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExamController } from './exam.controller';
import { ExamContestController } from './exam-contest.controller';
import { ExamService } from './exam.service';
import { ExamContestService } from './exam-contest.service';
import { ExamSessionGuard } from './guards/exam-session.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SubmissionModule } from '../submission/submission.module';
import { MinioModule } from '../minio/minio.module';
import { QueueModule } from '../queue/queue.module';
import { RedisModule } from '../redis/redis.module';
import { CodeSafetyModule } from '../code-safety/code-safety.module';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    RedisModule,
    QueueModule,
    CodeSafetyModule,
    forwardRef(() => SubmissionModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is required but not set');
        }
        return { secret };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [ExamController, ExamContestController],
  providers: [ExamService, ExamContestService, ExamSessionGuard],
  exports: [ExamService, ExamContestService],
})
export class ExamModule {}
