import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';
import { getClientIp } from '../common/request-ip';
import { AddCourseMembersDto } from './dto/add-course-members.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateCourseMemberRoleDto } from './dto/course-member.dto';
import { CourseService } from './course.service';
import { DeleteCourseDto } from './dto/delete-course.dto';
import { AuditResult } from '@prisma/client';
import { CourseProblemQueryDto } from './dto/course-problem-query.dto';
import { CreateCourseProblemDto } from './dto/create-course-problem.dto';
import { UpdateCourseProblemDto } from './dto/update-course-problem.dto';
import { CloneProblemToCourseDto } from './dto/clone-problem-to-course.dto';

type RequestMeta = { ip?: string; userAgent?: string };

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async listCourses(
    @Query() query: CourseQueryDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.courseService.listCourses(query, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get('my-courses/problems')
  async listAllCourseProblems(
    @Query() query: CourseProblemQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.listAllCourseProblems(query, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/problems')
  async listCourseProblems(
    @Param('slug') slug: string,
    @Query() query: CourseProblemQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.listCourseProblems(slug, query, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/problems/:problemId')
  async getCourseProblemDetail(
    @Param('slug') slug: string,
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.getCourseProblemDetail(slug, problemId, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/problems')
  async createCourseProblem(
    @Param('slug') slug: string,
    @Body() dto: CreateCourseProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.createCourseProblem(slug, dto, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/problems/clone')
  async cloneProblemToCourse(
    @Param('slug') slug: string,
    @Body() dto: CloneProblemToCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.cloneProblemToCourse(slug, dto, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Patch(':slug/problems/:problemId')
  async updateCourseProblem(
    @Param('slug') slug: string,
    @Param('problemId') problemId: string,
    @Body() dto: UpdateCourseProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.updateCourseProblem(slug, problemId, dto, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post()
  async createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.createCourse(dto, user, this.extractMeta(req));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('join/:token')
  async getJoinLinkCourse(@Param('token') token: string) {
    return this.courseService.getJoinLinkCourse(token);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post('join/:token')
  async joinByLink(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.joinByLink(token, user, this.extractMeta(req));
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Patch(':slug')
  async updateCourse(
    @Param('slug') slug: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.updateCourse(
      slug,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/archive')
  async archiveCourse(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.archiveCourse(slug, user, this.extractMeta(req));
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Delete(':slug')
  async deleteCourse(
    @Param('slug') slug: string,
    @Body() dto: DeleteCourseDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.deleteCourse(
      slug,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async getDetail(
    @Param('slug') slug: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.courseService.getDetail(slug, user?.sub ?? null);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/stats')
  async getStats(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.getStats(slug, user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/members')
  async listMembers(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.listMembers(slug, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/members')
  async addMembers(
    @Param('slug') slug: string,
    @Body() dto: AddCourseMembersDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.addMembers(
      slug,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Patch(':slug/members/:userId')
  async updateMemberRole(
    @Param('slug') slug: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateCourseMemberRoleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.updateMemberRole(
      slug,
      userId,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Delete(':slug/members/:userId')
  async removeMember(
    @Param('slug') slug: string,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.removeMember(
      slug,
      userId,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/join')
  async joinCourse(
    @Param('slug') slug: string,
    @Body() dto: JoinCourseDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.joinCourse(
      slug,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/join-public')
  async joinPublic(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.joinPublic(slug, user, this.extractMeta(req));
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post(':slug/leave')
  async leaveCourse(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseService.leaveCourse(
      slug,
      user.sub,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/audit/logins')
  async listCourseLoginAudits(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('result') result?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedResult = this.parseAuditResult(result);
    return this.courseService.listCourseLoginAudits(slug, user, {
      startAt,
      endAt,
      result: parsedResult,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/audit/submissions')
  async listCourseSubmissionAudits(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('userId') userId?: string,
    @Query('homeworkId') homeworkId?: string,
    @Query('problemId') problemId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.courseService.listCourseSubmissionAudits(slug, user, {
      startAt,
      endAt,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      homeworkId,
      problemId,
      status,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/audit/logins/export')
  async exportCourseLoginAuditsCsv(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Query('startAt') startAt: string | undefined,
    @Query('endAt') endAt: string | undefined,
    @Query('result') result: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.courseService.exportCourseLoginAuditsCsv(slug, user, {
      startAt,
      endAt,
      result: this.parseAuditResult(result),
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="course-login-audits.csv"',
    );
    return csv;
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':slug/audit/submissions/export')
  async exportCourseSubmissionAuditsCsv(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Query('startAt') startAt: string | undefined,
    @Query('endAt') endAt: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('homeworkId') homeworkId: string | undefined,
    @Query('problemId') problemId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.courseService.exportCourseSubmissionAuditsCsv(slug, user, {
      startAt,
      endAt,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      homeworkId,
      problemId,
      status,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="course-submission-audits.csv"',
    );
    return csv;
  }

  private extractMeta(req: Request): RequestMeta {
    return {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    };
  }

  private parseAuditResult(result?: string): AuditResult | undefined {
    if (!result) return undefined;
    if (result === AuditResult.SUCCESS || result === AuditResult.FAILURE) {
      return result;
    }
    return undefined;
  }
}
