import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailRateLimiterService } from './email-rate-limiter.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [MailService, EmailRateLimiterService],
  exports: [MailService, EmailRateLimiterService],
})
export class MailModule {}
