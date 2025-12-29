import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Req,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SubmissionService } from './submission.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('submissions/:id/artifacts')
export class ArtifactsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly submissionService: SubmissionService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 下載提交的產物
   * 支援兩種認證方式：
   * 1. Header Authorization: Bearer <token>
   * 2. Query parameter: ?token=<token>
   */
  @Get('download')
  @UseGuards(OptionalJwtAuthGuard)
  async downloadArtifacts(
    @Param('id') id: string,
    @Query('token') queryToken: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // 嘗試從 query 或 header 取得使用者資訊
    let user: JwtPayload | undefined;

    if (queryToken) {
      try {
        user = this.jwtService.verify(queryToken) as JwtPayload;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    } else if (req.user) {
      user = req.user;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // 權限檢查：只有提交者、Admin、或課程老師/TA 可以下載
    await this.submissionService.checkSubmissionAccess(
      id,
      user.sub,
      user.role,
    );

    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: {
        artifactsKey: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('提交不存在');
    }

    if (!submission.artifactsKey) {
      throw new NotFoundException('此提交沒有產物');
    }

    // 從 MinIO 下載
    const buffer = await this.minio.getObject(
      'noj-artifacts',
      submission.artifactsKey,
    );

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="artifacts-${id}.zip"`,
    );
    res.send(buffer);
  }

  /**
   * 取得產物資訊
   * 支援兩種認證方式：
   * 1. Header Authorization: Bearer <token>
   * 2. Query parameter: ?token=<token>
   */
  @Get('info')
  @UseGuards(OptionalJwtAuthGuard)
  async getArtifactsInfo(
    @Param('id') id: string,
    @Query('token') queryToken: string | undefined,
    @Req() req: any,
  ) {
    // 嘗試從 query 或 header 取得使用者資訊
    let user: JwtPayload | undefined;

    if (queryToken) {
      try {
        user = this.jwtService.verify(queryToken) as JwtPayload;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    } else if (req.user) {
      user = req.user;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // 權限檢查：只有提交者、Admin、或課程老師/TA 可以查看
    await this.submissionService.checkSubmissionAccess(
      id,
      user.sub,
      user.role,
    );

    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        artifactsKey: true,
        createdAt: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('提交不存在');
    }

    return {
      hasArtifacts: !!submission.artifactsKey,
      artifactsKey: submission.artifactsKey,
      createdAt: submission.createdAt,
    };
  }
}
