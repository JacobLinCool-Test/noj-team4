import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CreateZipSubmissionDto } from './dto/create-zip-submission.dto';
import { TestCodeDto } from './dto/test-code.dto';
import { TestZipDto } from './dto/test-zip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlockedSourceType, SubmissionStatus, TokenScope } from '@prisma/client';
import { TestRunnerService } from '../test-runner/test-runner.service';
import { Throttle } from '@nestjs/throttler';
import { getClientIp } from '../common/request-ip';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { CodeSafetyService } from '../code-safety/code-safety.service';

@Controller('problems/:displayId/submissions')
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly testRunnerService: TestRunnerService,
    private readonly codeSafetyService: CodeSafetyService,
  ) {}

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_SUBMISSIONS)
  @Post()
  async create(
    @Param('displayId') displayId: string,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @Req() req: any,
  ) {
    // AI safety check
    const safetyResult = await this.codeSafetyService.checkCodeSafety({
      source: createSubmissionDto.source,
      language: createSubmissionDto.language,
      userId: req.user.sub,
      problemId: undefined,
      sourceType: BlockedSourceType.SUBMIT,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    if (!safetyResult.isSafe) {
      throw new ForbiddenException({
        error: 'CODE_BLOCKED',
        reason: safetyResult.reason,
        threatType: safetyResult.threatType,
      });
    }

    return this.submissionService.create(
      req.user.sub,
      displayId,
      createSubmissionDto,
      getClientIp(req),
      req.headers['user-agent'],
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_SUBMISSIONS)
  @Post('test')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async testCode(
    @Param('displayId') displayId: string,
    @Body() testCodeDto: TestCodeDto,
    @Req() req: any,
  ) {
    // AI safety check
    const safetyResult = await this.codeSafetyService.checkCodeSafety({
      source: testCodeDto.source,
      language: testCodeDto.language,
      userId: req.user.sub,
      problemId: undefined,
      sourceType: BlockedSourceType.TEST,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    if (!safetyResult.isSafe) {
      throw new ForbiddenException({
        error: 'CODE_BLOCKED',
        reason: safetyResult.reason,
        threatType: safetyResult.threatType,
      });
    }

    return this.testRunnerService.testCode(
      req.user.sub,
      displayId,
      testCodeDto.language,
      testCodeDto.source,
      testCodeDto.customInput,
      testCodeDto.homeworkId,
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_SUBMISSIONS)
  @Post('test-zip')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
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
  async testZip(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() testZipDto: TestZipDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('ZIP file is required');
    }

    return this.testRunnerService.testMultiFile(
      req.user.sub,
      displayId,
      testZipDto.language,
      file,
      testZipDto.customInput,
      testZipDto.homeworkId,
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_SUBMISSIONS)
  @Post('zip')
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
  async createWithZip(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateZipSubmissionDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('ZIP file is required');
    }

    return this.submissionService.createWithZip(
      req.user.sub,
      displayId,
      file,
      {
        language: dto.language,
        courseId: dto.courseId ? parseInt(dto.courseId, 10) : undefined,
        homeworkId: dto.homeworkId,
      },
      getClientIp(req),
      req.headers['user-agent'],
    );
  }
}

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_SUBMISSIONS)
  @Get()
  async findAll(
    @Req() req: any,
    @Query('mine') mine?: string,
    @Query('courseId') courseId?: string,
    @Query('homeworkId') homeworkId?: string,
    @Query('problemId') problemId?: string,
    @Query('status') status?: SubmissionStatus,
    @Query('userId') targetUserId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.submissionService.findAll(req.user.sub, req.user.role, {
      mine: mine === 'true',
      courseId: courseId ? parseInt(courseId, 10) : undefined,
      homeworkId,
      problemId,
      status,
      targetUserId: targetUserId ? parseInt(targetUserId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_SUBMISSIONS)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.submissionService.findOne(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_SUBMISSIONS)
  @Get(':id/source')
  async getSource(@Param('id') id: string, @Req() req: any) {
    return this.submissionService.getSubmissionSource(
      id,
      req.user.sub,
      req.user.role,
    );
  }
}
