import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTokenService } from './api-token.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { ApiTokenDto, CreatedApiTokenDto } from './dto/api-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { Request } from 'express';
import { getClientIp } from '../common/request-ip';

@Controller('api-tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApiTokenDto,
    @Req() req: Request,
  ): Promise<CreatedApiTokenDto> {
    return this.apiTokenService.create(
      user.sub,
      dto,
      getClientIp(req),
      req.headers['user-agent'],
    );
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload): Promise<ApiTokenDto[]> {
    return this.apiTokenService.listUserTokens(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) tokenId: number,
  ): Promise<void> {
    await this.apiTokenService.revoke(user.sub, tokenId);
  }
}
