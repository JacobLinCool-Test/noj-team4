import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { PipelineService } from './pipeline.service';
import { UpdatePipelineConfigDto } from './dto/update-pipeline-config.dto';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { TokenScope, ProgrammingLanguage } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('problems/:displayId/pipeline')
export class PipelineProblemController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly pipelineService: PipelineService,
  ) {}

  /**
   * 更新題目的 Pipeline 配置
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Patch('config')
  async updatePipelineConfig(
    @Param('displayId') displayId: string,
    @Body() dto: UpdatePipelineConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = await this.pipelineService.ensureCanModifyPipeline(
      displayId,
      user,
    );

    return this.prisma.problem.update({
      where: { id: problemId },
      data: {
        submissionType: dto.submissionType,
        pipelineConfig: dto.pipelineConfig,
        artifactPaths: dto.artifactPaths,
        networkConfig: dto.networkConfig,
      },
    });
  }

  /**
   * 上傳自訂 Checker
   * @param language - Checker 的程式語言 (C, CPP, JAVA, PYTHON)
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('checker')
  @UseInterceptors(FileInterceptor('file'))
  async uploadChecker(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('language') language: ProgrammingLanguage,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = await this.pipelineService.ensureCanModifyPipeline(
      displayId,
      user,
    );

    if (!file) {
      throw new BadRequestException('請上傳檔案');
    }

    // 驗證語言參數
    const validLanguages = Object.values(ProgrammingLanguage);
    if (!language || !validLanguages.includes(language)) {
      throw new BadRequestException(
        `請指定有效的 Checker 語言: ${validLanguages.join(', ')}`,
      );
    }

    // 上傳到 MinIO
    const key = `checkers/${displayId}/${file.originalname}`;
    await this.minio.putObject('noj-checkers', key, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // 更新題目（同時儲存 checkerKey 和 checkerLanguage）
    await this.prisma.problem.update({
      where: { id: problemId },
      data: {
        checkerKey: key,
        checkerLanguage: language,
      },
    });

    return {
      message: 'Checker 上傳成功',
      checkerKey: key,
      checkerLanguage: language,
    };
  }

  /**
   * 上傳函式模板
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('template')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplate(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = await this.pipelineService.ensureCanModifyPipeline(
      displayId,
      user,
    );

    if (!file) {
      throw new BadRequestException('請上傳檔案');
    }

    // 上傳到 MinIO
    const key = `templates/${displayId}/${file.originalname}`;
    await this.minio.putObject('noj-templates', key, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // 更新題目
    await this.prisma.problem.update({
      where: { id: problemId },
      data: { templateKey: key },
    });

    return {
      message: '模板上傳成功',
      templateKey: key,
    };
  }

  /**
   * 上傳 Makefile（用於多檔案專案提交）
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('makefile')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMakefile(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = await this.pipelineService.ensureCanModifyPipeline(
      displayId,
      user,
    );

    if (!file) {
      throw new BadRequestException('請上傳檔案');
    }

    // 驗證檔案名稱（允許 Makefile 或 makefile）
    const filename = file.originalname.toLowerCase();
    if (filename !== 'makefile') {
      throw new BadRequestException('請上傳名為 Makefile 的檔案');
    }

    // 上傳到 MinIO
    const key = `makefiles/${displayId}/Makefile`;
    await this.minio.putObject('noj-makefiles', key, file.buffer, {
      'Content-Type': 'text/plain',
    });

    // 更新題目
    await this.prisma.problem.update({
      where: { id: problemId },
      data: { makefileKey: key },
    });

    return {
      message: 'Makefile 上傳成功',
      makefileKey: key,
    };
  }

  /**
   * 刪除 Makefile
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('makefile/delete')
  async deleteMakefile(
    @Param('displayId') displayId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = await this.pipelineService.ensureCanModifyPipeline(
      displayId,
      user,
    );

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { makefileKey: true },
    });

    if (problem?.makefileKey) {
      // 從 MinIO 刪除（可選，也可以保留）
      try {
        await this.minio.deleteObject('noj-makefiles', problem.makefileKey);
      } catch {
        // 忽略刪除失敗
      }
    }

    // 更新題目
    await this.prisma.problem.update({
      where: { id: problemId },
      data: { makefileKey: null },
    });

    return {
      message: 'Makefile 已刪除',
    };
  }

  /**
   * 取得 Pipeline 配置
   * 使用 OptionalAuthGuard：
   * - 公開題目：任何人都可查看
   * - 非公開題目：需登入且為課程成員/擁有者/管理員
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('config')
  async getPipelineConfig(
    @Param('displayId') displayId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    // 權限檢查並取得題目資訊
    const problem = await this.pipelineService.ensureCanViewPipeline(
      displayId,
      user,
    );

    return {
      submissionType: problem.submissionType,
      pipelineConfig: problem.pipelineConfig,
      checkerKey: problem.checkerKey,
      checkerLanguage: problem.checkerLanguage,
      templateKey: problem.templateKey,
      makefileKey: problem.makefileKey,
      artifactPaths: problem.artifactPaths,
      networkConfig: problem.networkConfig,
    };
  }
}
