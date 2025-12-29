import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { QueueService } from '../queue/queue.service';
import {
  SubmissionStatus,
  ProgrammingLanguage,
  UserRole,
  CourseRole,
  ProblemVisibility,
} from '@prisma/client';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly queue: QueueService,
  ) {}

  /**
   * Create submission with ZIP file (for MULTI_FILE submission type)
   */
  async createWithZip(
    userId: number,
    problemDisplayId: string,
    file: Express.Multer.File,
    dto: { language: ProgrammingLanguage; courseId?: number; homeworkId?: string },
    ip?: string,
    userAgent?: string,
  ) {
    // Resolve problem by displayId
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        allowedLanguages: true,
        submissionType: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Verify submission type is MULTI_FILE
    if (problem.submissionType !== 'MULTI_FILE') {
      throw new BadRequestException('ZIP_SUBMISSION_NOT_ALLOWED');
    }

    // Check course/homework context
    if (dto.courseId || dto.homeworkId) {
      await this.validateCourseHomeworkContext(
        userId,
        problem.id,
        dto.courseId,
        dto.homeworkId,
      );
    }

    const courseContext = await this.resolveCourseContext(
      problem.id,
      userId,
      dto.courseId,
    );

    if (!dto.homeworkId && dto.courseId && !courseContext) {
      throw new ForbiddenException('COURSE_PROBLEM_ACCESS_DENIED');
    }

    if (
      problem.visibility !== ProblemVisibility.PUBLIC &&
      problem.ownerId !== userId &&
      !dto.homeworkId &&
      !courseContext
    ) {
      throw new ForbiddenException('PROBLEM_ACCESS_DENIED');
    }

    const effectiveCourseId = dto.courseId ?? courseContext?.courseId;

    // Check language allowed
    const effectiveAllowed = await this.getEffectiveAllowedLanguages(
      problem.id,
      problem.allowedLanguages,
      dto.homeworkId,
    );
    if (!effectiveAllowed.includes(dto.language)) {
      throw new BadRequestException('SUBMISSION_LANGUAGE_NOT_ALLOWED');
    }

    // Check quota
    await this.checkQuota(userId, problem.id, courseContext ?? undefined);

    // Create submission first
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: problem.id,
        courseId: effectiveCourseId,
        homeworkId: dto.homeworkId,
        language: dto.language,
        status: SubmissionStatus.PENDING,
        sourceKey: '', // Will update after MinIO upload
        testdataVersion: 1,
        ip,
        userAgent,
      },
    });

    // Upload ZIP file to MinIO
    const sourceKey = `submissions/${submission.id}/source.zip`;
    await this.minio.putObject('noj-submissions', sourceKey, file.buffer);

    // Update submission with sourceKey
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { sourceKey },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SUBMISSION_CREATE,
        userId,
        ip,
        userAgent,
        detail: {
          submissionId: submission.id,
          problemId: problem.id,
          problemDisplayId,
          language: dto.language,
          courseId: effectiveCourseId,
          homeworkId: dto.homeworkId,
          isZipSubmission: true,
        },
      },
    });

    // Enqueue judge job
    await this.queue.enqueueJudgeSubmission(submission.id);

    return { submissionId: submission.id };
  }

  async create(
    userId: number,
    problemDisplayId: string,
    dto: CreateSubmissionDto,
    ip?: string,
    userAgent?: string,
  ) {
    // Resolve problem by displayId
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        allowedLanguages: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Check course/homework context
    if (dto.courseId || dto.homeworkId) {
      await this.validateCourseHomeworkContext(
        userId,
        problem.id,
        dto.courseId,
        dto.homeworkId,
      );
    }

    const courseContext = await this.resolveCourseContext(
      problem.id,
      userId,
      dto.courseId,
    );

    if (!dto.homeworkId && dto.courseId && !courseContext) {
      throw new ForbiddenException('COURSE_PROBLEM_ACCESS_DENIED');
    }

    if (
      problem.visibility !== ProblemVisibility.PUBLIC &&
      problem.ownerId !== userId &&
      !dto.homeworkId &&
      !courseContext
    ) {
      throw new ForbiddenException('PROBLEM_ACCESS_DENIED');
    }

    const effectiveCourseId = dto.courseId ?? courseContext?.courseId;

    // Check language allowed (effective in homework context)
    const effectiveAllowed = await this.getEffectiveAllowedLanguages(
      problem.id,
      problem.allowedLanguages,
      dto.homeworkId,
    );
    if (!effectiveAllowed.includes(dto.language)) {
      throw new BadRequestException('SUBMISSION_LANGUAGE_NOT_ALLOWED');
    }

    // Check quota
    await this.checkQuota(userId, problem.id, courseContext ?? undefined);

    // Create submission first (let Prisma generate cuid)
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: problem.id,
        courseId: effectiveCourseId,
        homeworkId: dto.homeworkId,
        language: dto.language,
        status: SubmissionStatus.PENDING,
        sourceKey: '', // Will update after MinIO upload
        testdataVersion: 1, // M0: always 1, M2: from ProblemTestdata
        ip,
        userAgent,
      },
    });

    // Generate source key using the generated submission ID
    const sourceKey = `submissions/${submission.id}/main${this.getFileExtension(dto.language)}`;

    // Upload source to MinIO
    await this.minio.putObject('noj-submissions', sourceKey, dto.source);

    // Update submission with sourceKey
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { sourceKey },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SUBMISSION_CREATE,
        userId,
        ip,
        userAgent,
        detail: {
          submissionId: submission.id,
          problemId: problem.id,
          problemDisplayId,
          language: dto.language,
          courseId: effectiveCourseId,
          homeworkId: dto.homeworkId,
        },
      },
    });

    // Enqueue judge job
    await this.queue.enqueueJudgeSubmission(submission.id);

    return { submissionId: submission.id };
  }

  async findAll(
    userId: number,
    userRole: UserRole,
    query: {
      mine?: boolean;
      courseId?: number;
      homeworkId?: string;
      problemId?: string;
      status?: SubmissionStatus;
      targetUserId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Permission check
    if (userRole === UserRole.USER || query.mine) {
      where.userId = userId;
    } else if (query.targetUserId) {
      where.userId = query.targetUserId;
    }

    // Additional filters
    if (query.courseId) {
      where.courseId = query.courseId;
      // Check if user has access to this course
      if (userRole !== UserRole.ADMIN) {
        const member = await this.prisma.courseMember.findUnique({
          where: {
            courseId_userId: { courseId: query.courseId, userId },
          },
        });
        if (!member) {
          throw new ForbiddenException('COURSE_ACCESS_DENIED');
        }
      }
    }

    if (query.homeworkId) {
      where.homeworkId = query.homeworkId;
    }

    if (query.problemId) {
      const problem = await this.prisma.problem.findUnique({
        where: { displayId: query.problemId },
      });
      if (problem) {
        where.problemId = problem.id;
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
          problem: {
            select: {
              id: true,
              displayId: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(submissionId: string, userId: number, userRole: UserRole) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
        problem: {
          select: {
            id: true,
            displayId: true,
            title: true,
            canViewStdout: true,
          },
        },
        cases: {
          orderBy: { caseNo: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('SUBMISSION_NOT_FOUND');
    }

    // Permission check
    const canView = await this.canViewSubmission(submission, userId, userRole);

    if (!canView) {
      throw new ForbiddenException('SUBMISSION_ACCESS_DENIED');
    }

    // Determine if user can view stdout/stderr
    const canViewOutput = await this.canViewOutput(submission, userId, userRole);

    // Filter cases if needed
    const cases = submission.cases.map((c) => ({
      ...c,
      stdoutTrunc: canViewOutput ? c.stdoutTrunc : null,
      stderrTrunc: canViewOutput ? c.stderrTrunc : null,
    }));

    return {
      ...submission,
      cases,
      compileLog: canViewOutput ? submission.compileLog : null,
    };
  }

  async getSubmissionSource(
    submissionId: string,
    userId: number,
    userRole: UserRole,
  ): Promise<{ source: string }> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        problemId: true,
        courseId: true,
        sourceKey: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('SUBMISSION_NOT_FOUND');
    }

    // Permission check
    const canView = await this.canViewSubmission(submission, userId, userRole);

    if (!canView) {
      throw new ForbiddenException('SUBMISSION_ACCESS_DENIED');
    }

    // Get source from MinIO
    const source = await this.minio.getObjectAsString(
      'noj-submissions',
      submission.sourceKey,
    );

    return { source };
  }

  /**
   * Check if user has access to a submission (public method for use by other controllers)
   * Throws ForbiddenException if access is denied
   */
  async checkSubmissionAccess(
    submissionId: string,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        courseId: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('SUBMISSION_NOT_FOUND');
    }

    const canView = await this.canViewSubmission(submission, userId, userRole);

    if (!canView) {
      throw new ForbiddenException('SUBMISSION_ACCESS_DENIED');
    }
  }

  private async validateCourseHomeworkContext(
    userId: number,
    problemId: string,
    courseId?: number,
    homeworkId?: string,
  ) {
    if (homeworkId) {
      const homework = await this.prisma.homework.findUnique({
        where: { id: homeworkId },
        include: {
          course: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
          problems: {
            where: { problemId },
          },
        },
      });

      if (!homework) {
        throw new NotFoundException('HOMEWORK_NOT_FOUND');
      }

      if (homework.course.members.length === 0) {
        throw new ForbiddenException('NOT_COURSE_MEMBER');
      }

      if (homework.problems.length === 0) {
        throw new BadRequestException('PROBLEM_NOT_IN_HOMEWORK');
      }

      // Check homework time window
      const now = new Date();
      if (now < homework.startAt) {
        throw new BadRequestException('HOMEWORK_NOT_STARTED');
      }
      if (now > homework.endAt) {
        throw new BadRequestException('HOMEWORK_ENDED');
      }
    }
  }

  private async checkQuota(
    userId: number,
    problemId: string,
    courseContext?: { courseId: number; quota: number },
  ) {
    if (!courseContext) {
      return;
    }

    if (courseContext.quota === -1) {
      return;
    }

    // Count existing submissions
    const count = await this.prisma.submission.count({
      where: {
        userId,
        problemId,
        courseId: courseContext.courseId,
      },
    });

    if (count >= courseContext.quota) {
      throw new BadRequestException('SUBMISSION_QUOTA_EXCEEDED');
    }
  }

  private async resolveCourseContext(
    problemId: string,
    userId: number,
    courseId?: number,
  ): Promise<{ courseId: number; quota: number } | null> {
    const context = await this.prisma.courseProblem.findFirst({
      where: {
        problemId,
        courseId: courseId ?? undefined,
        course: {
          members: { some: { userId, leftAt: null } },
        },
      },
      select: { courseId: true, quota: true },
    });

    return context ?? null;
  }

  private async canViewSubmission(
    submission: any,
    userId: number,
    userRole: UserRole,
  ): Promise<boolean> {
    // Own submission
    if (submission.userId === userId) {
      return true;
    }

    // Admin can view all
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Course TEACHER/TA can view submissions in their courses
    if (submission.courseId) {
      const member = await this.prisma.courseMember.findUnique({
        where: {
          courseId_userId: {
            courseId: submission.courseId,
            userId,
          },
        },
      });

      if (
        member &&
        (member.roleInCourse === CourseRole.TEACHER ||
          member.roleInCourse === CourseRole.TA)
      ) {
        return true;
      }
    }

    return false;
  }

  private async canViewOutput(
    submission: any,
    userId: number,
    userRole: UserRole,
  ): Promise<boolean> {
    // Admin can always view
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Own submission + problem allows
    if (submission.userId === userId && submission.problem.canViewStdout) {
      return true;
    }

    // Course TEACHER/TA can view outputs in their courses
    if (submission.courseId) {
      const member = await this.prisma.courseMember.findUnique({
        where: {
          courseId_userId: {
            courseId: submission.courseId,
            userId,
          },
        },
      });

      if (
        member &&
        (member.roleInCourse === CourseRole.TEACHER ||
          member.roleInCourse === CourseRole.TA)
      ) {
        return true;
      }
    }

    return false;
  }

  private getFileExtension(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.C:
        return '.c';
      case ProgrammingLanguage.CPP:
        return '.cpp';
      case ProgrammingLanguage.JAVA:
        return '.java';
      case ProgrammingLanguage.PYTHON:
        return '.py';
      default:
        return '.txt';
    }
  }

  private async getEffectiveAllowedLanguages(
    problemId: string,
    problemAllowed: ProgrammingLanguage[],
    homeworkId?: string,
  ): Promise<ProgrammingLanguage[]> {
    if (!homeworkId) return problemAllowed;

    const hwProblem = await this.prisma.homeworkProblem.findUnique({
      where: { homeworkId_problemId: { homeworkId, problemId } },
      select: { allowedLanguagesOverride: true },
    });

    const override = hwProblem?.allowedLanguagesOverride;
    if (override && override.length > 0) return override;
    return problemAllowed;
  }
}
