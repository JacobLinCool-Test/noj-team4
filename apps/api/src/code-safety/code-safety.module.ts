import { Module } from '@nestjs/common';
import { CodeSafetyService } from './code-safety.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

@Module({
  imports: [PrismaModule, AiAssistantModule],
  providers: [CodeSafetyService],
  exports: [CodeSafetyService],
})
export class CodeSafetyModule {}
