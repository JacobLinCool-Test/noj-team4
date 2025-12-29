import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AiAssistantService } from './ai-assistant.service';
import { AiChatRequestDto } from './dto/ai-chat.dto';
import type { AiAvailabilityDto } from './dto/ai-availability.dto';
import { getClientIp } from '../common/request-ip';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  // Get latest global conversation with messages
  @Get('conversation/latest')
  async getLatestConversation(@CurrentUser() user: JwtPayload) {
    return this.aiService.getLatestConversation(user.sub);
  }

  // Start a new conversation (marks existing as ended)
  @Post('conversation/new')
  @HttpCode(HttpStatus.OK)
  async startNewConversation(@CurrentUser() user: JwtPayload) {
    return this.aiService.startNewConversation(user.sub);
  }

  // General availability endpoint (no problem context)
  @Get('availability')
  async getGeneralAvailability(
    @CurrentUser() user: JwtPayload,
  ): Promise<AiAvailabilityDto> {
    return this.aiService.getGeneralAvailability(user.sub);
  }

  // General chat endpoint (no problem context)
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async generalChat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 非串流模式：使用原本的 chat 方法
    if (!dto.stream) {
      const result = await this.aiService.chat({
        userId: user.sub,
        dto,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return res.json(result);
    }

    // 串流模式：使用 chatStream 方法進行真正的 token-by-token 串流
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx buffering
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = this.aiService.chatStream({
      userId: user.sub,
      dto,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    try {
      // 先取得 meta chunk 以設定 conversationId header
      const firstChunk = await stream.next();
      if (
        !firstChunk.done &&
        firstChunk.value.type === 'meta' &&
        firstChunk.value.conversationId
      ) {
        res.setHeader('X-Conversation-Id', firstChunk.value.conversationId);
      }

      // 現在才 flush headers
      res.flushHeaders?.();

      // 繼續處理剩餘的 chunks
      for await (const chunk of stream) {
        if (chunk.type === 'chunk' && chunk.text) {
          res.write(chunk.text);
          // 強制 flush 確保立即送出
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      }
    } catch (error) {
      if (!res.headersSent) {
        res.flushHeaders?.();
      }
      const message =
        error instanceof Error ? error.message : 'AI_PROVIDER_ERROR';
      res.write(`\n\n[Error: ${message}]`);
    }

    res.end();
  }

  // Problem-specific availability endpoint
  @Get('problems/:problemId/availability')
  async getAvailability(
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
    @Query('homeworkId') homeworkId?: string,
  ): Promise<AiAvailabilityDto> {
    return this.aiService.getAvailability({
      problemIdOrDisplayId: problemId,
      userId: user.sub,
      homeworkId,
    });
  }

  // Problem-specific chat endpoint
  @Post('problems/:problemId/chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Query('homeworkId') homeworkId?: string,
  ) {
    // 非串流模式：使用原本的 chat 方法
    if (!dto.stream) {
      const result = await this.aiService.chat({
        problemIdOrDisplayId: problemId,
        userId: user.sub,
        homeworkId,
        dto,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return res.json(result);
    }

    // 串流模式：使用 chatStream 方法進行真正的 token-by-token 串流
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx buffering
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = this.aiService.chatStream({
      problemIdOrDisplayId: problemId,
      userId: user.sub,
      homeworkId,
      dto,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    try {
      // 先取得 meta chunk 以設定 conversationId header
      const firstChunk = await stream.next();
      if (
        !firstChunk.done &&
        firstChunk.value.type === 'meta' &&
        firstChunk.value.conversationId
      ) {
        res.setHeader('X-Conversation-Id', firstChunk.value.conversationId);
      }

      // 現在才 flush headers
      res.flushHeaders?.();

      // 繼續處理剩餘的 chunks
      for await (const chunk of stream) {
        if (chunk.type === 'chunk' && chunk.text) {
          res.write(chunk.text);
          // 強制 flush 確保立即送出
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      }
    } catch (error) {
      if (!res.headersSent) {
        res.flushHeaders?.();
      }
      const message =
        error instanceof Error ? error.message : 'AI_PROVIDER_ERROR';
      res.write(`\n\n[Error: ${message}]`);
    }

    res.end();
  }
}
