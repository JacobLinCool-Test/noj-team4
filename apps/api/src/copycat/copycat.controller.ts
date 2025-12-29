import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { CopycatService } from './copycat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import {
  CopycatReportDto,
  TriggerCopycatResponseDto,
  PaginatedCopycatPairsDto,
  CopycatPairsQueryDto,
  CopycatPairDetailDto,
} from './dto/copycat-report.dto';
import { ProgrammingLanguage } from '@prisma/client';

@Controller('courses/:courseId/problems/:problemId/copycat')
@UseGuards(JwtAuthGuard)
export class CopycatController {
  constructor(private readonly copycatService: CopycatService) {}

  /**
   * Trigger copycat analysis for a course problem
   * Returns 202 Accepted with report ID
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async trigger(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TriggerCopycatResponseDto> {
    return this.copycatService.trigger(courseId, problemId, user.sub);
  }

  /**
   * Get copycat report status and summary
   */
  @Get()
  async getReport(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CopycatReportDto> {
    const report = await this.copycatService.getReport(
      courseId,
      problemId,
      user.sub,
    );

    if (!report) {
      throw new NotFoundException('COPYCAT_REPORT_NOT_FOUND');
    }

    return report;
  }

  /**
   * Get paginated pairs for a copycat report
   */
  @Get('pairs')
  async getPairs(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('problemId') problemId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('minSimilarity') minSimilarity?: string,
    @Query('language') language?: ProgrammingLanguage,
    @CurrentUser() user?: JwtPayload,
  ): Promise<PaginatedCopycatPairsDto> {
    const query: CopycatPairsQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined,
      language,
    };

    return this.copycatService.getPairs(courseId, problemId, user!.sub, query);
  }

  /**
   * Get pair detail with source code
   */
  @Get('pairs/:pairId')
  async getPairDetail(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('problemId') problemId: string,
    @Param('pairId') pairId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CopycatPairDetailDto> {
    const detail = await this.copycatService.getPairDetail(
      courseId,
      problemId,
      pairId,
      user.sub,
    );

    if (!detail) {
      throw new NotFoundException('COPYCAT_PAIR_NOT_FOUND');
    }

    return detail;
  }

  /**
   * Delete a copycat report
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.copycatService.deleteReport(courseId, problemId, user.sub);
  }
}
