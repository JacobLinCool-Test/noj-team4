import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ExamContestService } from './exam-contest.service';
import { ExamLoginDto } from './dto';
import { ExamSessionGuard } from './guards/exam-session.guard';
import { CurrentExamSession } from './decorators/current-exam-session.decorator';
import type { ExamSession } from './types';
import { getClientIp } from './utils';
import { BlockedSourceType, ProgrammingLanguage } from '@prisma/client';
import { CodeSafetyService } from '../code-safety/code-safety.service';

// DTO for code submission
class ContestSubmitDto {
  code: string;
  language: string;
}

// DTO for ZIP submission
class ContestSubmitZipDto {
  language: string;
}

@Controller('contest')
export class ExamContestController {
  constructor(
    private readonly examContestService: ExamContestService,
    private readonly codeSafetyService: CodeSafetyService,
  ) {}

  /**
   * 考試登入
   */
  @Post('login')
  async login(
    @Body() dto: ExamLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const { session, token } = await this.examContestService.login(
      dto,
      clientIp,
      userAgent,
    );

    // 設定 HttpOnly Cookie
    res.cookie('exam_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: session.exam.endsAt.getTime() - Date.now(),
    });

    return {
      success: true,
      exam: this.examContestService.getExamInfo(session),
      time: this.examContestService.getTimeRemaining(session),
    };
  }

  /**
   * 登出
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('exam_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { success: true };
  }

  /**
   * 取得當前 Session
   */
  @Get('me')
  @UseGuards(ExamSessionGuard)
  async getMe(@CurrentExamSession() session: ExamSession) {
    return {
      user: session.user,
      exam: this.examContestService.getExamInfo(session),
      time: this.examContestService.getTimeRemaining(session),
    };
  }

  /**
   * 取得題目列表
   */
  @Get('problems')
  @UseGuards(ExamSessionGuard)
  async getProblems(@CurrentExamSession() session: ExamSession) {
    const problems = await this.examContestService.getProblems(session);
    return {
      problems,
      time: this.examContestService.getTimeRemaining(session),
    };
  }

  /**
   * 取得題目詳情
   */
  @Get('problems/:problemId')
  @UseGuards(ExamSessionGuard)
  async getProblem(
    @CurrentExamSession() session: ExamSession,
    @Param('problemId') problemId: string,
  ) {
    const problem = await this.examContestService.getProblem(
      session,
      problemId,
    );
    return {
      problem,
      time: this.examContestService.getTimeRemaining(session),
    };
  }

  /**
   * 取得提交列表
   */
  @Get('submissions')
  @UseGuards(ExamSessionGuard)
  async getSubmissions(@CurrentExamSession() session: ExamSession) {
    const submissions =
      await this.examContestService.getSubmissions(session);
    return { submissions };
  }

  /**
   * 取得提交詳情
   */
  @Get('submissions/:submissionId')
  @UseGuards(ExamSessionGuard)
  async getSubmission(
    @CurrentExamSession() session: ExamSession,
    @Param('submissionId') submissionId: string,
  ) {
    const submission = await this.examContestService.getSubmission(
      session,
      submissionId,
    );
    return { submission };
  }

  /**
   * 取得排行榜
   */
  @Get('scoreboard')
  @UseGuards(ExamSessionGuard)
  async getScoreboard(@CurrentExamSession() session: ExamSession) {
    const scoreboard =
      await this.examContestService.getScoreboard(session);
    return { scoreboard };
  }

  /**
   * 取得剩餘時間
   */
  @Get('time')
  @UseGuards(ExamSessionGuard)
  async getTime(@CurrentExamSession() session: ExamSession) {
    return this.examContestService.getTimeRemaining(session);
  }

  /**
   * 提交程式碼（單一檔案）
   */
  @Post('problems/:problemId/submit')
  @UseGuards(ExamSessionGuard)
  async submitCode(
    @CurrentExamSession() session: ExamSession,
    @Param('problemId') problemId: string,
    @Body() dto: ContestSubmitDto,
    @Req() req: Request,
  ) {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Map language string to ProgrammingLanguage enum
    const languageMap: Record<string, ProgrammingLanguage> = {
      c: ProgrammingLanguage.C,
      cpp: ProgrammingLanguage.CPP,
      'c++': ProgrammingLanguage.CPP,
      java: ProgrammingLanguage.JAVA,
      python: ProgrammingLanguage.PYTHON,
      python3: ProgrammingLanguage.PYTHON,
      // Also support NOJ format directly
      C: ProgrammingLanguage.C,
      CPP: ProgrammingLanguage.CPP,
      JAVA: ProgrammingLanguage.JAVA,
      PYTHON: ProgrammingLanguage.PYTHON,
    };

    const language = languageMap[dto.language];
    if (!language) {
      throw new BadRequestException(`Unsupported language: ${dto.language}`);
    }

    // AI safety check
    const safetyResult = await this.codeSafetyService.checkCodeSafety({
      source: dto.code,
      language,
      userId: session.user?.id,
      problemId,
      sourceType: BlockedSourceType.EXAM_SUBMIT,
      ip: clientIp,
      userAgent,
      examId: session.exam.id,
    });
    if (!safetyResult.isSafe) {
      throw new ForbiddenException({
        error: 'CODE_BLOCKED',
        reason: safetyResult.reason,
        threatType: safetyResult.threatType,
      });
    }

    const submission = await this.examContestService.submitCode(
      session,
      problemId,
      dto.code,
      language,
      clientIp,
      userAgent,
    );

    return { submission };
  }

  /**
   * 提交 ZIP 檔案（多檔案）
   */
  @Post('problems/:problemId/submit-zip')
  @UseGuards(ExamSessionGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype === 'application/zip' ||
          file.mimetype === 'application/x-zip-compressed' ||
          file.originalname.endsWith('.zip')
        ) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only ZIP files are allowed'), false);
        }
      },
    }),
  )
  async submitZip(
    @CurrentExamSession() session: ExamSession,
    @Param('problemId') problemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ContestSubmitZipDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('ZIP file is required');
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Map language string to ProgrammingLanguage enum
    const languageMap: Record<string, ProgrammingLanguage> = {
      c: ProgrammingLanguage.C,
      cpp: ProgrammingLanguage.CPP,
      'c++': ProgrammingLanguage.CPP,
      java: ProgrammingLanguage.JAVA,
      python: ProgrammingLanguage.PYTHON,
      python3: ProgrammingLanguage.PYTHON,
      C: ProgrammingLanguage.C,
      CPP: ProgrammingLanguage.CPP,
      JAVA: ProgrammingLanguage.JAVA,
      PYTHON: ProgrammingLanguage.PYTHON,
    };

    const language = languageMap[dto.language];
    if (!language) {
      throw new BadRequestException(`Unsupported language: ${dto.language}`);
    }

    const submission = await this.examContestService.submitZip(
      session,
      problemId,
      file,
      language,
      clientIp,
      userAgent,
    );

    return { submission };
  }
}
