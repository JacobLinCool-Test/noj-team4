import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestdataService } from './testdata.service';
import { SubtaskConfigDto } from './dto/subtask-config.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';

@Controller('problems/:displayId/testdata')
export class TestdataController {
  constructor(private readonly testdataService: TestdataService) {}

  /**
   * Upload testdata package for a problem
   * POST /problems/:displayId/testdata
   * Body: multipart/form-data with 'file' field containing ZIP
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('TESTDATA_FILE_REQUIRED');
    }

    if (
      file.mimetype !== 'application/zip' &&
      !file.originalname.endsWith('.zip')
    ) {
      throw new BadRequestException('TESTDATA_MUST_BE_ZIP');
    }

    return this.testdataService.uploadTestdata(
      displayId,
      req.user.sub,
      req.user.role,
      file.buffer,
    );
  }

  /**
   * List all testdata versions for a problem
   * GET /problems/:displayId/testdata
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_PROBLEMS)
  @Get()
  async listVersions(@Param('displayId') displayId: string, @Req() req: any) {
    return this.testdataService.listVersions(
      displayId,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Set a testdata version as active
   * PATCH /problems/:displayId/testdata/activate
   * Body: { version: number }
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Patch('activate')
  async setActiveVersion(
    @Param('displayId') displayId: string,
    @Body('version') version: number,
    @Req() req: any,
  ) {
    if (!version || typeof version !== 'number') {
      throw new BadRequestException('TESTDATA_VERSION_REQUIRED');
    }

    return this.testdataService.setActiveVersion(
      displayId,
      version,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Upload testdata with subtask configuration (sstt.in/out format)
   * POST /problems/:displayId/testdata/subtasks
   * Body: multipart/form-data with 'file' (ZIP) and 'config' (JSON string)
   *
   * The config JSON should match SubtaskConfigDto:
   * {
   *   "subtasks": [
   *     { "caseCount": 3, "points": 10 },
   *     { "caseCount": 5, "points": 30, "timeLimitMs": 2000 }
   *   ],
   *   "defaultTimeLimitMs": 1000,
   *   "defaultMemoryLimitKb": 262144
   * }
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('subtasks')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWithSubtasks(
    @Param('displayId') displayId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('config') configJson: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('TESTDATA_FILE_REQUIRED');
    }

    if (
      file.mimetype !== 'application/zip' &&
      file.mimetype !== 'application/x-zip-compressed' &&
      !file.originalname.endsWith('.zip')
    ) {
      throw new BadRequestException('TESTDATA_MUST_BE_ZIP');
    }

    if (!configJson) {
      throw new BadRequestException('TESTDATA_CONFIG_REQUIRED');
    }

    // Parse and validate config
    let configData: any;
    try {
      configData = JSON.parse(configJson);
    } catch (error) {
      throw new BadRequestException('TESTDATA_CONFIG_INVALID_JSON');
    }

    const config = plainToInstance(SubtaskConfigDto, configData);
    const errors = await validate(config);
    if (errors.length > 0) {
      const messages = errors
        .flatMap((err) =>
          err.children && err.children.length > 0
            ? err.children.flatMap((child) =>
                child.children && child.children.length > 0
                  ? child.children.map((grandchild) =>
                      Object.values(grandchild.constraints || {}).join(', '),
                    )
                  : Object.values(child.constraints || {}).join(', '),
              )
            : Object.values(err.constraints || {}).join(', '),
        )
        .filter(Boolean)
        .join('; ');
      throw new BadRequestException(`TESTDATA_CONFIG_INVALID: ${messages}`);
    }

    return this.testdataService.uploadTestdataWithSubtasks(
      displayId,
      req.user.sub,
      req.user.role,
      file.buffer,
      config,
    );
  }

  /**
   * Link AI-generated testdata to a problem using testdataKey
   * POST /problems/:displayId/testdata/link
   * Body: { testdataKey: string }
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post('link')
  async linkAiTestdata(
    @Param('displayId') displayId: string,
    @Body('testdataKey') testdataKey: string,
    @Req() req: any,
  ) {
    if (!testdataKey) {
      throw new BadRequestException('TESTDATA_KEY_REQUIRED');
    }

    return this.testdataService.linkAiTestdata(
      displayId,
      req.user.sub,
      req.user.role,
      testdataKey,
    );
  }

  /**
   * Download testdata ZIP for a specific version
   * GET /problems/:displayId/testdata/:version/download
   */
  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_PROBLEMS)
  @Get(':version/download')
  async downloadTestdata(
    @Param('displayId') displayId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.testdataService.downloadTestdata(
      displayId,
      version,
      req.user.sub,
      req.user.role,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
