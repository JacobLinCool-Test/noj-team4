import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditResult,
  CourseEnrollmentType,
  CourseJoinRequestStatus,
  CourseRole,
  CourseStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { CourseJoinRequestResponseDto } from './dto/join-request.dto';

type RequestMeta = { ip?: string; userAgent?: string };

@Injectable()
export class CourseJoinRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createJoinRequest(
    courseSlug: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseJoinRequestResponseDto> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { userId: viewer.sub, leftAt: null },
          select: { roleInCourse: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('找不到此課程');
    }

    if (course.status !== CourseStatus.ACTIVE) {
      throw new BadRequestException('此課程已封存或刪除');
    }

    if (course.enrollmentType !== CourseEnrollmentType.APPROVAL) {
      throw new BadRequestException('此課程不支援申請加入');
    }

    if (course.members.length > 0) {
      throw new BadRequestException('你已經是課程成員');
    }

    const existingRequest = await this.prisma.courseJoinRequest.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: viewer.sub,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === CourseJoinRequestStatus.PENDING) {
        throw new BadRequestException('你已經提交過申請，請等待審核');
      }
      if (existingRequest.status === CourseJoinRequestStatus.REJECTED) {
        throw new BadRequestException('你的申請已被拒絕');
      }
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const req = await tx.courseJoinRequest.upsert({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId: viewer.sub,
          },
        },
        create: {
          courseId: course.id,
          userId: viewer.sub,
          status: CourseJoinRequestStatus.PENDING,
        },
        update: {
          status: CourseJoinRequestStatus.PENDING,
          reviewedAt: null,
          reviewedById: null,
        },
        include: {
          course: { select: { id: true, slug: true, name: true, term: true } },
          user: { select: { id: true, username: true, nickname: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_JOIN_REQUEST_CREATE,
          userId: viewer.sub,
          courseId: course.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      return req;
    });

    return this.mapToResponse(request);
  }

  async listCourseJoinRequests(
    courseSlug: string,
    viewer: JwtPayload,
  ): Promise<CourseJoinRequestResponseDto[]> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { userId: viewer.sub, leftAt: null },
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
      throw new ForbiddenException('只有教師或助教可以查看申請列表');
    }

    const requests = await this.prisma.courseJoinRequest.findMany({
      where: { courseId: course.id },
      include: {
        course: { select: { id: true, slug: true, name: true, term: true } },
        user: { select: { id: true, username: true, nickname: true } },
        reviewedBy: { select: { id: true, username: true, nickname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.mapToResponse(r));
  }

  async approveJoinRequest(
    courseSlug: string,
    requestId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseJoinRequestResponseDto> {
    const { course, request } = await this.validateReviewPermission(
      courseSlug,
      requestId,
      viewer,
    );

    if (request.status !== CourseJoinRequestStatus.PENDING) {
      throw new BadRequestException('此申請已被處理');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.courseJoinRequest.update({
        where: { id: requestId },
        data: {
          status: CourseJoinRequestStatus.APPROVED,
          reviewedById: viewer.sub,
          reviewedAt: new Date(),
        },
        include: {
          course: { select: { id: true, slug: true, name: true, term: true } },
          user: { select: { id: true, username: true, nickname: true } },
          reviewedBy: { select: { id: true, username: true, nickname: true } },
        },
      });

      if (request.userId === null) {
        throw new BadRequestException('Request has no associated user');
      }
      const requestUserId = request.userId;

      const existing = await tx.courseMember.findUnique({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId: requestUserId,
          },
        },
      });

      if (existing) {
        await tx.courseMember.update({
          where: {
            courseId_userId: {
              courseId: course.id,
              userId: requestUserId,
            },
          },
          data: { roleInCourse: CourseRole.STUDENT, leftAt: null },
        });
      } else {
        await tx.courseMember.create({
          data: {
            courseId: course.id,
            userId: requestUserId,
            roleInCourse: CourseRole.STUDENT,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_JOIN_REQUEST_APPROVE,
          userId: viewer.sub,
          courseId: course.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { requestId, targetUserId: request.userId },
        },
      });

      return updated;
    });

    return this.mapToResponse(result);
  }

  async rejectJoinRequest(
    courseSlug: string,
    requestId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseJoinRequestResponseDto> {
    const { course, request } = await this.validateReviewPermission(
      courseSlug,
      requestId,
      viewer,
    );

    if (request.status !== CourseJoinRequestStatus.PENDING) {
      throw new BadRequestException('此申請已被處理');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.courseJoinRequest.update({
        where: { id: requestId },
        data: {
          status: CourseJoinRequestStatus.REJECTED,
          reviewedById: viewer.sub,
          reviewedAt: new Date(),
        },
        include: {
          course: { select: { id: true, slug: true, name: true, term: true } },
          user: { select: { id: true, username: true, nickname: true } },
          reviewedBy: { select: { id: true, username: true, nickname: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_JOIN_REQUEST_REJECT,
          userId: viewer.sub,
          courseId: course.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { requestId, targetUserId: request.userId },
        },
      });

      return updated;
    });

    return this.mapToResponse(result);
  }

  async listMyJoinRequests(
    viewer: JwtPayload,
  ): Promise<CourseJoinRequestResponseDto[]> {
    const requests = await this.prisma.courseJoinRequest.findMany({
      where: { userId: viewer.sub },
      include: {
        course: {
          select: { id: true, slug: true, name: true, term: true, status: true },
        },
        user: { select: { id: true, username: true, nickname: true } },
        reviewedBy: { select: { id: true, username: true, nickname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests
      .filter((r) => r.course.status === CourseStatus.ACTIVE)
      .map((r) => this.mapToResponse(r));
  }

  async cancelMyJoinRequest(
    requestId: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<void> {
    const request = await this.prisma.courseJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('找不到此申請');
    }

    if (request.userId !== viewer.sub) {
      throw new ForbiddenException('此申請不屬於你');
    }

    if (request.status !== CourseJoinRequestStatus.PENDING) {
      throw new BadRequestException('此申請已被處理，無法撤回');
    }

    await this.prisma.courseJoinRequest.delete({
      where: { id: requestId },
    });
  }

  private async validateReviewPermission(
    courseSlug: string,
    requestId: string,
    viewer: JwtPayload,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        members: {
          where: { userId: viewer.sub, leftAt: null },
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
      throw new ForbiddenException('只有教師或助教可以審核申請');
    }

    const request = await this.prisma.courseJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.courseId !== course.id) {
      throw new NotFoundException('找不到此申請');
    }

    return { course, request };
  }

  private mapToResponse(request: {
    id: string;
    courseId: number;
    course: { id: number; slug: string | null; name: string; term: string };
    userId: number | null;
    user: { id: number; username: string; nickname: string | null } | null;
    status: CourseJoinRequestStatus;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewedBy?: { id: number; username: string; nickname: string | null } | null;
  }): CourseJoinRequestResponseDto {
    return {
      id: request.id,
      courseId: request.courseId,
      course: {
        id: request.course.id,
        slug: request.course.slug!,
        name: request.course.name,
        term: request.course.term,
      },
      userId: request.userId ?? 0,
      user: request.user ? {
        id: request.user.id,
        username: request.user.username,
        nickname: request.user.nickname,
      } : { id: 0, username: 'Unknown', nickname: null },
      status: request.status,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy
        ? {
            id: request.reviewedBy.id,
            username: request.reviewedBy.username,
            nickname: request.reviewedBy.nickname,
          }
        : null,
    };
  }
}
