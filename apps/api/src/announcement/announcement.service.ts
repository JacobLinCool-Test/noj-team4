import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Announcement, AnnouncementScope, CourseRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourseAnnouncements(
    courseId: number,
    userId: number,
  ): Promise<AnnouncementResponseDto[]> {
    const role = await this.ensureCourseMember(courseId, userId);

    const announcements = await this.prisma.announcement.findMany({
      where: { courseId, scope: AnnouncementScope.COURSE },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => this.toResponse(a, { role, userId }));
  }

  async getCourseAnnouncement(
    courseId: number,
    announcementId: number,
    userId: number,
  ): Promise<AnnouncementResponseDto> {
    const role = await this.ensureCourseMember(courseId, userId);

    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, courseId, scope: AnnouncementScope.COURSE },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return this.toResponse(announcement, { role, userId });
  }

  async createCourseAnnouncement(
    courseId: number,
    userId: number,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const role = await this.ensureCourseMember(courseId, userId);
    this.ensureStaffRole(role);

    const created = await this.prisma.announcement.create({
      data: {
        scope: AnnouncementScope.COURSE,
        courseId,
        title: dto.title.trim(),
        content: dto.content,
        isPinned: dto.isPinned ?? false,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
      },
    });

    return this.toResponse(created, { role, userId });
  }

  async updateCourseAnnouncement(
    courseId: number,
    announcementId: number,
    userId: number,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const { role } = await this.assertCanModifyAnnouncement({
      courseId,
      announcementId,
      userId,
    });

    const updated = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: dto.title?.trim(),
        content: dto.content,
        isPinned: dto.isPinned,
      },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
      },
    });

    return this.toResponse(updated, { role, userId });
  }

  async deleteCourseAnnouncement(
    courseId: number,
    announcementId: number,
    userId: number,
  ): Promise<void> {
    const { announcement } = await this.assertCanModifyAnnouncement({
      courseId,
      announcementId,
      userId,
    });

    await this.prisma.announcement.delete({ where: { id: announcement.id } });
  }

  private async ensureCourseMember(
    courseId: number,
    userId: number,
  ): Promise<CourseRole> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const membership = await this.prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId } },
      select: { roleInCourse: true, leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('僅課程成員可存取公告');
    }

    return membership.roleInCourse;
  }

  private ensureStaffRole(role: CourseRole) {
    if (role !== CourseRole.TEACHER && role !== CourseRole.TA) {
      throw new ForbiddenException('只有教師或助教可以執行此操作');
    }
  }

  private async assertCanModifyAnnouncement(params: {
    courseId: number;
    announcementId: number;
    userId: number;
  }): Promise<{
    announcement: { id: number; authorId: number | null };
    role: CourseRole;
    isAuthor: boolean;
  }> {
    const { courseId, announcementId, userId } = params;
    const role = await this.ensureCourseMember(courseId, userId);

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, courseId: true, scope: true, authorId: true },
    });

    if (
      !announcement ||
      announcement.courseId !== courseId ||
      announcement.scope !== AnnouncementScope.COURSE
    ) {
      throw new NotFoundException('Announcement not found');
    }

    if (role === CourseRole.STUDENT) {
      throw new ForbiddenException('Students cannot modify announcements');
    }

    const isTeacher = role === CourseRole.TEACHER;
    const isTa = role === CourseRole.TA;
    const isAuthor = announcement.authorId === userId;

    if (isTeacher || (isTa && isAuthor)) {
      return {
        announcement: { id: announcement.id, authorId: announcement.authorId },
        role,
        isAuthor,
      };
    }

    throw new ForbiddenException(
      'You are not allowed to modify this announcement',
    );
  }

  private toResponse(
    announcement: Announcement & {
      author: { id: number; username: string; nickname: string | null } | null;
    },
    viewer?: { role: CourseRole; userId: number },
  ): AnnouncementResponseDto {
    const isTeacher = viewer?.role === CourseRole.TEACHER;
    const isTa = viewer?.role === CourseRole.TA;
    const isAuthor = viewer && announcement.author ? announcement.author.id === viewer.userId : false;
    const canEdit = Boolean(viewer && (isTeacher || (isTa && isAuthor)));

    return {
      id: announcement.id,
      courseId: announcement.courseId!,
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      author: announcement.author ? {
        id: announcement.author.id,
        username: announcement.author.username,
        nickname: announcement.author.nickname,
      } : { id: 0, username: 'Unknown', nickname: null },
      canEdit,
      canDelete: canEdit,
    };
  }
}
