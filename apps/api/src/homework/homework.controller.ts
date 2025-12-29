import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CourseService } from '../course/course.service';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';

@Controller('courses/:courseSlug/homeworks')
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly courseService: CourseService,
  ) {}

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get()
  async list(
    @Param('courseSlug') courseSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.homeworkService.listHomeworks(courseId, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post()
  async create(
    @Param('courseSlug') courseSlug: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.homeworkService.createHomework(courseId, user, dto);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':homeworkId')
  async detail(
    @Param('courseSlug') courseSlug: string,
    @Param('homeworkId') homeworkId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.homeworkService.getHomework(courseId, homeworkId, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Patch(':homeworkId')
  async update(
    @Param('courseSlug') courseSlug: string,
    @Param('homeworkId') homeworkId: string,
    @Body() dto: UpdateHomeworkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.homeworkService.updateHomework(courseId, homeworkId, user, dto);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Delete(':homeworkId')
  async remove(
    @Param('courseSlug') courseSlug: string,
    @Param('homeworkId') homeworkId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    await this.homeworkService.deleteHomework(courseId, homeworkId, user);
    return { ok: true };
  }
}
