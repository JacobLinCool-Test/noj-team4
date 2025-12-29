import { Module, forwardRef } from '@nestjs/common';
import { TranslatorController } from './translator.controller';
import { TranslatorService } from './translator.service';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [forwardRef(() => AiAssistantModule), RedisModule],
  controllers: [TranslatorController],
  providers: [TranslatorService],
  exports: [TranslatorService],
})
export class TranslatorModule {}
