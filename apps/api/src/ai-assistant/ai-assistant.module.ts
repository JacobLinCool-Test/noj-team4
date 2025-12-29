import { Module, forwardRef } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiCoreService } from './ai-core.service';
import { EnhancedRateLimitService } from './enhanced-rate-limit.service';
import { ProblemModule } from '../problem/problem.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [forwardRef(() => ProblemModule), MinioModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiCoreService, EnhancedRateLimitService],
  exports: [AiCoreService, EnhancedRateLimitService],
})
export class AiAssistantModule {}
