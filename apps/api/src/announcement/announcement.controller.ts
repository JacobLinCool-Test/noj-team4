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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CourseService } from '../course/course.service';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';

@Controller('courses/:courseSlug/announcements')
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
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
    return this.announcementService.listCourseAnnouncements(courseId, user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get(':id')
  async getOne(
    @Param('courseSlug') courseSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.announcementService.getCourseAnnouncement(
      courseId,
      id,
      user.sub,
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post()
  async create(
    @Param('courseSlug') courseSlug: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.announcementService.createCourseAnnouncement(
      courseId,
      user.sub,
      dto,
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Patch(':id')
  async update(
    @Param('courseSlug') courseSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    return this.announcementService.updateCourseAnnouncement(
      courseId,
      id,
      user.sub,
      dto,
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Delete(':id')
  async remove(
    @Param('courseSlug') courseSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const courseId = await this.courseService.getCourseIdBySlug(courseSlug);
    await this.announcementService.deleteCourseAnnouncement(
      courseId,
      id,
      user.sub,
    );
    return { ok: true };
  }
}
