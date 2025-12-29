import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TranslatorService } from './translator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';

@Controller('problems/:displayId/translate')
export class TranslatorController {
  constructor(
    private readonly translatorService: TranslatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 觸發題目翻譯
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async triggerTranslation(
    @Param('displayId') displayId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // 找到題目
    const problem = await this.prisma.problem.findUnique({
      where: { displayId },
      select: { id: true, ownerId: true },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    // 檢查權限（只有擁有者可以翻譯）
    if (problem.ownerId !== user.sub) {
      throw new ForbiddenException('Only the owner can trigger translation');
    }

    // 觸發翻譯
    await this.translatorService.translateProblem(problem.id, user.sub);

    return { status: 'pending', message: '翻譯已開始，請稍後查詢狀態' };
  }

  /**
   * 查詢翻譯狀態
   */
  @Get('status')
  async getTranslationStatus(@Param('displayId') displayId: string) {
    // 找到題目
    const problem = await this.prisma.problem.findUnique({
      where: { displayId },
      select: { id: true },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const status = await this.translatorService.getTranslationStatus(
      problem.id,
    );

    if (!status) {
      throw new NotFoundException('Problem not found');
    }

    return status;
  }
}
