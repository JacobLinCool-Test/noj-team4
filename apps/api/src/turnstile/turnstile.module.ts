import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TurnstileService } from './turnstile.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [TurnstileService],
  exports: [TurnstileService],
})
export class TurnstileModule {}
