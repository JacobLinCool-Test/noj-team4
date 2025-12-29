import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExamService } from './exam.service';
import { CreateExamDto, UpdateExamDto, GenerateCodesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('courses/:courseSlug/exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  /**
   * 建立考試
   */
  @Post()
  async createExam(
    @Param('courseSlug') courseSlug: string,
    @Body() dto: CreateExamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.createExam(courseSlug, dto, user);
  }

  /**
   * 取得考試列表
   */
  @Get()
  async listExams(
    @Param('courseSlug') courseSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const exams = await this.examService.listExams(courseSlug, user);
    return { exams };
  }

  /**
   * 取得考試詳情
   */
  @Get(':examId')
  async getExam(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.getExam(courseSlug, examId, user);
  }

  /**
   * 更新考試
   */
  @Patch(':examId')
  async updateExam(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.updateExam(courseSlug, examId, dto, user);
  }

  /**
   * 刪除考試
   */
  @Delete(':examId')
  async deleteExam(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.deleteExam(courseSlug, examId, user);
  }

  /**
   * 生成登入代碼
   */
  @Post(':examId/codes')
  async generateCodes(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @Body() dto: GenerateCodesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const codes = await this.examService.generateCodes(
      courseSlug,
      examId,
      dto,
      user,
    );
    return { codes };
  }

  /**
   * 取得代碼列表
   */
  @Get(':examId/codes')
  async listCodes(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const codes = await this.examService.listCodes(courseSlug, examId, user);
    return { codes };
  }

  /**
   * 匯出代碼（CSV）
   */
  @Get(':examId/codes/export')
  async exportCodes(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.examService.exportCodes(courseSlug, examId, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-${examId}-codes.csv"`,
    );
    res.send(csv);
  }

  /**
   * 重新生成代碼
   */
  @Post(':examId/codes/:code/regenerate')
  async regenerateCode(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.regenerateCode(courseSlug, examId, code, user);
  }

  /**
   * 刪除代碼
   */
  @Delete(':examId/codes/:code')
  async deleteCode(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.deleteCode(courseSlug, examId, code, user);
  }

  /**
   * 取得考試提交紀錄
   */
  @Get(':examId/submissions')
  async listSubmissions(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const submissions = await this.examService.listSubmissions(
      courseSlug,
      examId,
      user,
    );
    return { submissions };
  }

  /**
   * 取得成績排行榜
   */
  @Get(':examId/scoreboard')
  async getScoreboard(
    @Param('courseSlug') courseSlug: string,
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examService.getScoreboard(courseSlug, examId, user);
  }
}
