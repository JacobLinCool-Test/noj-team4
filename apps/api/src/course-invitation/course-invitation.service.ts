import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditResult,
  CourseInvitationStatus,
  CourseRole,
  CourseStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type {
  CreateInvitationsDto,
  CreateInvitationsResultDto,
} from './dto/create-invitations.dto';
import type { CourseInvitationResponseDto } from './dto/invitation-response.dto';

type RequestMeta = { ip?: string; userAgent?: string };

@Injectable()
export class CourseInvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvitations(
    courseSlug: string,
    dto: CreateInvitationsDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CreateInvitationsResultDto> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { leftAt: null },
          select: { userId: true, roleInCourse: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('找不到此課程');
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new ForbiddenException('已封存的課程無法邀請新成員');
    }

    const viewerMember = course.members.find((m) => m.userId === viewer.sub);
    const isAdmin = viewer.role === UserRole.ADMIN;
    const isStaff =
      viewerMember?.roleInCourse === CourseRole.TEACHER ||
      viewerMember?.roleInCourse === CourseRole.TA;

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException('只有教師或助教可以邀請成員');
    }

    const emails = this.parseEmails(dto.emails);
    if (emails.length === 0) {
      throw new BadRequestException('請提供至少一個有效的 Email');
    }

    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: emails, mode: 'insensitive' } },
      select: { id: true, email: true },
    });
    const userMap = new Map(
      existingUsers.map((u) => [u.email.toLowerCase(), u]),
    );

    const existingMembers = await this.prisma.courseMember.findMany({
      where: {
        courseId: course.id,
        user: { email: { in: emails, mode: 'insensitive' } },
        leftAt: null,
      },
      include: { user: { select: { email: true } } },
    });
    const memberEmails = new Set(
      existingMembers.map((m) => m.user.email.toLowerCase()),
    );

    const existingInvitations = await this.prisma.courseInvitation.findMany({
      where: {
        courseId: course.id,
        email: { in: emails.map((e) => e.toLowerCase()) },
        status: CourseInvitationStatus.PENDING,
      },
    });
    const pendingEmails = new Set(
      existingInvitations.map((i) => i.email.toLowerCase()),
    );

    const result: CreateInvitationsResultDto = {
      invited: [],
      alreadyMember: [],
      alreadyInvited: [],
      invalidEmail: [],
    };

    const toCreate: Array<{
      email: string;
      inviteeId: number | null;
    }> = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase();

      if (memberEmails.has(normalizedEmail)) {
        result.alreadyMember.push(email);
        continue;
      }

      if (pendingEmails.has(normalizedEmail)) {
        result.alreadyInvited.push(email);
        continue;
      }

      const user = userMap.get(normalizedEmail);
      toCreate.push({
        email: normalizedEmail,
        inviteeId: user?.id ?? null,
      });
      result.invited.push(email);
    }

    if (toCreate.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of toCreate) {
          await tx.courseInvitation.upsert({
            where: {
              courseId_email: {
                courseId: course.id,
                email: item.email,
              },
            },
            create: {
              courseId: course.id,
              email: item.email,
              inviteeId: item.inviteeId,
              invitedById: viewer.sub,
              status: CourseInvitationStatus.PENDING,
            },
            update: {
              inviteeId: item.inviteeId,
              invitedById: viewer.sub,
              status: CourseInvitationStatus.PENDING,
              respondedAt: null,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: AuditAction.COURSE_INVITATION_CREATE,
            userId: viewer.sub,
            courseId: course.id,
            result: AuditResult.SUCCESS,
            ip: meta.ip,
            userAgent: meta.userAgent,
            detail: {
              invitedCount: toCreate.length,
              emails: toCreate.map((i) => i.email),
            },
          },
        });
      });
    }

    return result;
  }

  async listCourseInvitations(
    courseSlug: string,
    viewer: JwtPayload,
  ): Promise<CourseInvitationResponseDto[]> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { leftAt: null, userId: viewer.sub },
          select: { roleInCourse: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('找不到此課程');
    }

    const isAdmin = viewer.role === UserRole.ADMIN;
    const viewerMember = course.members[0];
    const isStaff =
      viewerMember?.roleInCourse === CourseRole.TEACHER ||
      viewerMember?.roleInCourse === CourseRole.TA;

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException('只有教師或助教可以查看邀請列表');
    }

    const invitations = await this.prisma.courseInvitation.findMany({
      where: { courseId: course.id },
      include: {
        course: {
          select: { id: true, slug: true, name: true, term: true },
        },
        invitedBy: {
          select: { id: true, username: true, nickname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      courseId: inv.courseId,
      course: {
        id: inv.course.id,
        slug: inv.course.slug!,
        name: inv.course.name,
        term: inv.course.term,
      },
      email: inv.email,
      status: inv.status,
      invitedBy: inv.invitedBy ? {
        id: inv.invitedBy.id,
        username: inv.invitedBy.username,
        nickname: inv.invitedBy.nickname,
      } : { id: 0, username: 'Unknown', nickname: null },
      createdAt: inv.createdAt,
      respondedAt: inv.respondedAt,
    }));
  }

  async cancelInvitation(
    courseSlug: string,
    invitationId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { leftAt: null, userId: viewer.sub },
          select: { roleInCourse: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('找不到此課程');
    }

    const isAdmin = viewer.role === UserRole.ADMIN;
    const viewerMember = course.members[0];
    const isStaff =
      viewerMember?.roleInCourse === CourseRole.TEACHER ||
      viewerMember?.roleInCourse === CourseRole.TA;

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException('只有教師或助教可以取消邀請');
    }

    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.courseId !== course.id) {
      throw new NotFoundException('找不到此邀請');
    }

    if (invitation.status !== CourseInvitationStatus.PENDING) {
      throw new BadRequestException('此邀請已被處理，無法取消');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseInvitation.update({
        where: { id: invitationId },
        data: {
          status: CourseInvitationStatus.CANCELLED,
          respondedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_INVITATION_CANCEL,
          userId: viewer.sub,
          courseId: course.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { invitationId, email: invitation.email },
        },
      });
    });
  }

  async listMyInvitations(
    viewer: JwtPayload,
  ): Promise<CourseInvitationResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    const invitations = await this.prisma.courseInvitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: CourseInvitationStatus.PENDING,
      },
      include: {
        course: {
          select: { id: true, slug: true, name: true, term: true, status: true },
        },
        invitedBy: {
          select: { id: true, username: true, nickname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations
      .filter((inv) => inv.course.status === CourseStatus.ACTIVE)
      .map((inv) => ({
        id: inv.id,
        courseId: inv.courseId,
        course: {
          id: inv.course.id,
          slug: inv.course.slug!,
          name: inv.course.name,
          term: inv.course.term,
        },
        email: inv.email,
        status: inv.status,
        invitedBy: inv.invitedBy ? {
          id: inv.invitedBy.id,
          username: inv.invitedBy.username,
          nickname: inv.invitedBy.nickname,
        } : { id: 0, username: 'Unknown', nickname: null },
        createdAt: inv.createdAt,
        respondedAt: inv.respondedAt,
      }));
  }

  async acceptInvitation(
    invitationId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<{ courseSlug: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { id: invitationId },
      include: {
        course: { select: { slug: true, status: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('找不到此邀請');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('此邀請不屬於你');
    }

    if (invitation.status !== CourseInvitationStatus.PENDING) {
      throw new BadRequestException('此邀請已被處理');
    }

    if (invitation.course.status !== CourseStatus.ACTIVE) {
      throw new BadRequestException('此課程已封存或刪除');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseInvitation.update({
        where: { id: invitationId },
        data: {
          status: CourseInvitationStatus.ACCEPTED,
          respondedAt: new Date(),
          inviteeId: viewer.sub,
        },
      });

      const existing = await tx.courseMember.findUnique({
        where: {
          courseId_userId: {
            courseId: invitation.courseId,
            userId: viewer.sub,
          },
        },
      });

      if (existing) {
        await tx.courseMember.update({
          where: {
            courseId_userId: {
              courseId: invitation.courseId,
              userId: viewer.sub,
            },
          },
          data: { roleInCourse: CourseRole.STUDENT, leftAt: null },
        });
      } else {
        await tx.courseMember.create({
          data: {
            courseId: invitation.courseId,
            userId: viewer.sub,
            roleInCourse: CourseRole.STUDENT,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_INVITATION_ACCEPT,
          userId: viewer.sub,
          courseId: invitation.courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { invitationId },
        },
      });
    });

    return { courseSlug: invitation.course.slug! };
  }

  async rejectInvitation(
    invitationId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('找不到此邀請');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('此邀請不屬於你');
    }

    if (invitation.status !== CourseInvitationStatus.PENDING) {
      throw new BadRequestException('此邀請已被處理');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseInvitation.update({
        where: { id: invitationId },
        data: {
          status: CourseInvitationStatus.REJECTED,
          respondedAt: new Date(),
          inviteeId: viewer.sub,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_INVITATION_REJECT,
          userId: viewer.sub,
          courseId: invitation.courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { invitationId },
        },
      });
    });
  }

  private parseEmails(input: string): string[] {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return input
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && emailRegex.test(e));
  }
}
