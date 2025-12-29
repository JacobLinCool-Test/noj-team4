import { Module } from '@nestjs/common';
import { ApiTokenController } from './api-token.controller';
import { ApiTokenService } from './api-token.service';
import { ApiTokenStrategy } from './strategies/api-token.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiTokenController],
  providers: [ApiTokenService, ApiTokenStrategy],
  exports: [ApiTokenService],
})
export class ApiTokenModule {}
