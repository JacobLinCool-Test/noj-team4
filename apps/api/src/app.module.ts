import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { McpModule, TransportType } from '@bamada/nestjs-mcp';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { ProblemModule } from './problem/problem.module';
import { HomeworkModule } from './homework/homework.module';
import { UserModule } from './user/user.module';
import { MinioModule } from './minio/minio.module';
import { QueueModule } from './queue/queue.module';
import { SubmissionModule } from './submission/submission.module';
import { TestdataModule } from './testdata/testdata.module';
import { ApiTokenModule } from './api-token/api-token.module';
import { RedisModule } from './redis/redis.module';
import { AppThrottlerGuard } from './throttler/app-throttler.guard';
import { AdminModule } from './admin/admin.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { AiProblemCreatorModule } from './ai-problem-creator/ai-problem-creator.module';
import { CourseInvitationModule } from './course-invitation/course-invitation.module';
import { CourseJoinRequestModule } from './course-join-request/course-join-request.module';
import { CopycatModule } from './copycat/copycat.module';
import { ExamModule } from './exam/exam.module';
import { EmailDomainModule } from './email-domain/email-domain.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { TurnstileModule } from './turnstile/turnstile.module';
import { TranslatorModule } from './translator/translator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    SystemConfigModule,
    TurnstileModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 120,
      },
    ]),
    McpModule.forRoot({
      serverInfo: {
        name: 'noj-nest-mcp',
        version: '0.1.0',
      },
      transport: TransportType.SSE,
    }),
    PrismaModule,
    MinioModule,
    QueueModule,
    AuthModule,
    CourseModule,
    AnnouncementModule,
    ProblemModule,
    HomeworkModule,
    UserModule,
    SubmissionModule,
    TestdataModule,
    ApiTokenModule,
    AiAssistantModule,
    AiProblemCreatorModule,
    AdminModule,
    CourseInvitationModule,
    CourseJoinRequestModule,
    CopycatModule,
    ExamModule,
    EmailDomainModule,
    TranslatorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
