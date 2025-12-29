import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AiProblemCreatorService } from './ai-problem-creator.service';
import { SolutionExecutorService } from './solution-executor.service';
import { TestdataPackagerService } from './testdata-packager.service';
import { ProblemService } from '../problem/problem.service';
import { TranslatorService } from '../translator/translator.service';
import { StartSessionDto, ChatRequestDto } from './dto/chat.dto';
import { GenerateTestdataDto, GenerateTestdataOnlyDto } from './dto/generate-testdata.dto';
import { PublishProblemDto } from './dto/publish.dto';
import { getClientIp } from '../common/request-ip';
import { ProblemVisibility, ProgrammingLanguage } from '@prisma/client';

@Controller('ai-problem-creator')
@UseGuards(JwtAuthGuard)
export class AiProblemCreatorController {
  private readonly logger = new Logger(AiProblemCreatorController.name);

  constructor(
    private readonly service: AiProblemCreatorService,
    private readonly executor: SolutionExecutorService,
    private readonly packager: TestdataPackagerService,
    private readonly problemService: ProblemService,
    private readonly translatorService: TranslatorService,
  ) {}

  /**
   * Check availability and rate limit status
   */
  @Get('availability')
  async getAvailability(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.getAvailability(
      user.sub,
      getClientIp(req),
      deviceFingerprint,
      sessionId,
    );
  }

  /**
   * Start a new chat session
   */
  @Post('session/start')
  @HttpCode(HttpStatus.OK)
  async startSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartSessionDto,
  ) {
    return this.service.startSession(user.sub, dto.courseSlug);
  }

  /**
   * Get session problem data
   */
  @Get('session/problem-data')
  async getSessionProblemData(
    @CurrentUser() user: JwtPayload,
    @Query('sessionId') sessionId: string,
  ) {
    return this.service.getSessionProblemData(sessionId, user.sub);
  }

  /**
   * Chat endpoint (supports streaming)
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.parseLocale(acceptLanguage);
    const ip = getClientIp(req);

    // Check if streaming is requested (via query param or header)
    const isStreaming =
      req.query.stream === 'true' ||
      req.headers['accept'] === 'text/event-stream';

    if (!isStreaming) {
      // Non-streaming mode
      const result = await this.service.chat({
        sessionId: dto.sessionId,
        message: dto.message,
        userId: user.sub,
        ip,
        deviceFingerprint,
        locale,
        mode: dto.mode,
      });
      return res.json(result);
    }

    // Streaming mode - SSE format
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = this.service.chatStream({
      sessionId: dto.sessionId,
      message: dto.message,
      userId: user.sub,
      ip,
      deviceFingerprint,
      locale,
      mode: dto.mode,
    });

    try {
      for await (const chunk of stream) {
        if (chunk.type === 'meta') {
          res.write(`event: meta\ndata: ${JSON.stringify({ sessionId: chunk.sessionId })}\n\n`);
        } else if (chunk.type === 'chunk') {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
        } else if (chunk.type === 'problem_ready') {
          res.write(
            `event: problem_ready\ndata: ${JSON.stringify({
              problemData: chunk.problemData,
              solutionData: chunk.solutionData,
            })}\n\n`,
          );
        } else if (chunk.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        }

        // Force flush
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI_PROVIDER_ERROR';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[chat] Stream error: ${message}`, errorStack);
      this.logger.error(`[chat] Error context: userId=${user.sub}, sessionId=${dto.sessionId}, ip=${ip}`);

      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
    }

    res.end();
  }

  /**
   * Generate test data using solution code
   */
  @Post('generate-testdata')
  @HttpCode(HttpStatus.OK)
  async generateTestdata(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateTestdataDto,
  ) {
    // Get session data to retrieve problem info
    const sessionData = await this.service.getSessionProblemData(
      dto.sessionId,
      user.sub,
    );

    if (!sessionData.problemData) {
      throw new BadRequestException('NO_PROBLEM_DATA_IN_SESSION');
    }

    const { problemData } = sessionData;
    const maxRetries = 3;
    let lastError: string | undefined;

    // Try executing with retries
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Execute solution for all test inputs
        const results = await this.executor.executeBatch(
          dto.solutionCode,
          dto.testInputs,
          {
            language: dto.solutionLanguage,
            timeLimitMs: problemData.constraints.timeLimitMs * 2, // Give AI solution more time
            memoryLimitKb: problemData.constraints.memoryLimitKb,
          },
        );

        // Check for errors - including empty output which indicates a bug in the solution
        const errors = results
          .map((r, i) => {
            if (!r.success) {
              return { index: i, error: r.errorMessage || r.status };
            }
            // Treat empty output as an error - the solution should always produce output
            if (!r.output || r.output.trim() === '') {
              return { index: i, error: 'EMPTY_OUTPUT' };
            }
            return null;
          })
          .filter((e): e is { index: number; error: string } => e !== null);

        if (errors.length === 0) {
          // All succeeded, package the test data
          const testCases = [
            // Sample cases first
            ...problemData.sampleCases.map((sc) => ({
              input: sc.input,
              output: sc.output,
              isSample: true,
            })),
            // Then generated test cases
            ...results.map((r, i) => ({
              input: dto.testInputs[i],
              output: r.output,
              isSample: false,
            })),
          ];

          const packageResult = await this.packager.packageTestdata(testCases, {
            defaultTimeLimitMs: problemData.constraints.timeLimitMs,
            defaultMemoryLimitKb: problemData.constraints.memoryLimitKb,
          });

          return {
            success: true,
            testCases: testCases.map((tc, i) => ({
              index: i,
              input: tc.input,
              output: tc.output,
              status: 'SUCCESS',
              isSample: tc.isSample,
            })),
            totalGenerated: testCases.length,
            failedCount: 0,
            testdataKey: packageResult.key,
          };
        }

        // Some failed, store the error for potential retry
        lastError = errors.map((e) => `[${e.index}]: ${e.error}`).join('; ');

        if (attempt < maxRetries - 1) {
          // Wait before retry
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'EXECUTION_ERROR';
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // All retries failed
    return {
      success: false,
      testCases: [],
      totalGenerated: 0,
      failedCount: dto.testInputs.length,
      error: lastError || 'EXECUTION_FAILED',
    };
  }

  /**
   * Generate test data for an existing problem (standalone feature)
   */
  @Post('generate-testdata-only')
  @HttpCode(HttpStatus.OK)
  async generateTestdataOnly(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateTestdataOnlyDto,
  ) {
    // Use AI to analyze problem and generate solution + test inputs
    const aiResult = await this.service.generateSolutionAndTestInputs({
      problemDescription: dto.problemDescription,
      inputFormat: dto.inputFormat,
      outputFormat: dto.outputFormat,
      sampleCases: dto.sampleCases,
      numTestCases: dto.numTestCases || 10,
    });

    if (!aiResult.success) {
      return {
        success: false,
        testCases: [],
        totalGenerated: 0,
        failedCount: 0,
        error: aiResult.error || 'AI_GENERATION_FAILED',
      };
    }

    const maxRetries = 3;
    let lastError: string | undefined;

    // Try executing with retries
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Execute solution for all test inputs
        const results = await this.executor.executeBatch(
          aiResult.solutionCode,
          aiResult.testInputs,
          {
            language: aiResult.solutionLanguage,
            timeLimitMs: 10000, // Give AI solution more time
            memoryLimitKb: 524288,
          },
        );

        // Check for errors - including empty output which indicates a bug in the solution
        const errors = results
          .map((r, i) => {
            if (!r.success) {
              return { index: i, error: r.errorMessage || r.status };
            }
            // Treat empty output as an error - the solution should always produce output
            if (!r.output || r.output.trim() === '') {
              return { index: i, error: 'EMPTY_OUTPUT' };
            }
            return null;
          })
          .filter((e): e is { index: number; error: string } => e !== null);

        if (errors.length === 0) {
          // All succeeded, package the test data
          const testCases = [
            // Sample cases first
            ...dto.sampleCases.map((sc) => ({
              input: sc.input,
              output: sc.output,
              isSample: true,
            })),
            // Then generated test cases
            ...results.map((r, i) => ({
              input: aiResult.testInputs[i],
              output: r.output,
              isSample: false,
            })),
          ];

          const packageResult = await this.packager.packageTestdata(testCases, {
            defaultTimeLimitMs: 1000,
            defaultMemoryLimitKb: 262144,
          });

          return {
            success: true,
            testCases: testCases.map((tc, i) => ({
              index: i,
              input: tc.input,
              output: tc.output,
              status: 'SUCCESS',
              isSample: tc.isSample,
            })),
            totalGenerated: testCases.length,
            failedCount: 0,
            testdataKey: packageResult.key,
          };
        }

        // Some failed, store the error for potential retry
        lastError = errors.map((e) => `[${e.index}]: ${e.error}`).join('; ');

        if (attempt < maxRetries - 1) {
          // Wait before retry
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'EXECUTION_ERROR';
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // All retries failed
    return {
      success: false,
      testCases: [],
      totalGenerated: 0,
      failedCount: aiResult.testInputs.length,
      error: lastError || 'EXECUTION_FAILED',
    };
  }

  /**
   * Publish problem with test data
   */
  @Post('publish')
  @HttpCode(HttpStatus.CREATED)
  async publishProblem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PublishProblemDto,
    @Query('testdataKey') testdataKey?: string,
  ) {
    // Course problems are not supported yet - must use course problem creation flow
    if (dto.courseSlug) {
      throw new BadRequestException('Course problems should be created through course management');
    }

    // Create the problem with bilingual content
    const problem = await this.problemService.createProblem({
      title: dto.title,
      description: dto.description,
      input: dto.inputFormat,
      output: dto.outputFormat,
      hint: dto.hint,
      visibility: dto.visibility || ProblemVisibility.PUBLIC,
      difficulty: dto.difficulty,
      tags: dto.tags || [],
      allowedLanguages: dto.allowedLanguages || Object.values(ProgrammingLanguage),
      canViewStdout: dto.canViewStdout ?? false,
      sampleCases: dto.sampleCases,
      // Bilingual fields
      titleZh: dto.titleZh || dto.title,
      titleEn: dto.titleEn,
      descriptionZh: dto.descriptionZh || dto.description,
      descriptionEn: dto.descriptionEn,
      inputZh: dto.inputZh || dto.inputFormat,
      inputEn: dto.inputEn,
      outputZh: dto.outputZh || dto.outputFormat,
      outputEn: dto.outputEn,
      hintZh: dto.hintZh || dto.hint,
      hintEn: dto.hintEn,
      tagsZh: dto.tagsZh || dto.tags || [],
      tagsEn: dto.tagsEn || [],
    }, user.sub);

    // Link testdata if provided
    if (testdataKey) {
      // Read the manifest from the testdata ZIP
      const manifestFromZip = await this.packager.readManifestFromZip(testdataKey);
      await this.packager.createTestdataRecord(problem.id, {
        key: testdataKey,
        bucket: 'noj-testdata',
        size: 0, // Will be updated on read
        caseCount: manifestFromZip?.cases?.length || dto.sampleCases.length,
        manifest: manifestFromZip || {
          version: 1,
          createdAt: new Date().toISOString(),
          cases: [],
          totalScore: 100,
        },
      }, user.sub);
    }

    // Trigger auto-translation if requested (runs in background)
    if (dto.autoTranslate) {
      this.translatorService.translateProblem(problem.id, user.sub).catch((err) => {
        console.error('Failed to trigger auto-translation:', err);
      });
    }

    return {
      problemId: problem.id,
      displayId: problem.displayId,
      title: problem.title,
    };
  }

  private parseLocale(acceptLanguage?: string): 'zh-TW' | 'en' {
    if (!acceptLanguage) return 'zh-TW';
    if (acceptLanguage.includes('zh')) return 'zh-TW';
    if (acceptLanguage.includes('en')) return 'en';
    return 'zh-TW';
  }
}
