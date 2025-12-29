import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CopycatStatus, CourseRole, ProgrammingLanguage, Prisma } from '@prisma/client';
import {
  CopycatReportDto,
  TriggerCopycatResponseDto,
  PaginatedCopycatPairsDto,
  CopycatPairsQueryDto,
  CopycatPairDetailDto,
} from './dto/copycat-report.dto';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class CopycatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    @InjectQueue('copycat') private readonly copycatQueue: Queue,
  ) {}

  /**
   * Trigger copycat analysis for a course problem
   */
  async trigger(
    courseId: number,
    problemId: string,
    userId: number,
  ): Promise<TriggerCopycatResponseDto> {
    // 1. Validate course permission (TA or Teacher)
    await this.validatePermission(courseId, userId);

    // 2. Check if problem is in the course
    const courseProblem = await this.prisma.courseProblem.findUnique({
      where: { courseId_problemId: { courseId, problemId } },
    });

    if (!courseProblem) {
      throw new NotFoundException('PROBLEM_NOT_IN_COURSE');
    }

    // 3. Check if there's already a running job
    const existing = await this.prisma.copycatReport.findUnique({
      where: { courseId_problemId: { courseId, problemId } },
    });

    if (
      existing &&
      (existing.status === CopycatStatus.PENDING ||
        existing.status === CopycatStatus.RUNNING)
    ) {
      return {
        reportId: existing.id,
        status: existing.status,
      };
    }

    // 4. Create or update report
    const report = await this.prisma.copycatReport.upsert({
      where: { courseId_problemId: { courseId, problemId } },
      create: {
        courseId,
        problemId,
        requestedById: userId,
        status: CopycatStatus.PENDING,
      },
      update: {
        requestedById: userId,
        status: CopycatStatus.PENDING,
        summary: Prisma.DbNull,
        reportKey: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    // 5. Delete old pairs
    await this.prisma.copycatPair.deleteMany({
      where: { reportId: report.id },
    });

    // 6. Enqueue job
    await this.copycatQueue.add(
      'analyze',
      {
        reportId: report.id,
        courseId,
        problemId,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return {
      reportId: report.id,
      status: CopycatStatus.PENDING,
    };
  }

  /**
   * Get copycat report for a course problem
   */
  async getReport(
    courseId: number,
    problemId: string,
    userId: number,
  ): Promise<CopycatReportDto | null> {
    await this.validatePermission(courseId, userId);

    const report = await this.prisma.copycatReport.findUnique({
      where: { courseId_problemId: { courseId, problemId } },
      include: {
        requestedBy: {
          select: { id: true, username: true, nickname: true },
        },
        pairs: {
          where: { similarity: { gte: 0.5 } },
          orderBy: { similarity: 'desc' },
          take: 10,
          include: {
            leftUser: {
              select: { id: true, username: true, nickname: true },
            },
            rightUser: {
              select: { id: true, username: true, nickname: true },
            },
          },
        },
      },
    });

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      courseId: report.courseId,
      problemId: report.problemId,
      status: report.status,
      studentCount: report.studentCount,
      submissionCount: report.submissionCount,
      summary: report.summary as any,
      errorMessage: report.errorMessage,
      requestedBy: report.requestedBy ?? { id: 0, username: 'Unknown', nickname: null },
      createdAt: report.createdAt,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      topPairs: report.pairs.map((p) => {
        const defaultUser = { id: 0, username: 'Unknown', nickname: null };
        return {
          id: p.id,
          leftUser: p.leftUser ?? defaultUser,
          rightUser: p.rightUser ?? defaultUser,
          language: p.language,
          similarity: p.similarity,
          longestFragment: p.longestFragment,
          totalOverlap: p.totalOverlap,
        };
      }),
    };
  }

  /**
   * Get paginated pairs for a copycat report
   */
  async getPairs(
    courseId: number,
    problemId: string,
    userId: number,
    query: CopycatPairsQueryDto,
  ): Promise<PaginatedCopycatPairsDto> {
    await this.validatePermission(courseId, userId);

    const report = await this.prisma.copycatReport.findUnique({
      where: { courseId_problemId: { courseId, problemId } },
    });

    if (!report) {
      throw new NotFoundException('COPYCAT_REPORT_NOT_FOUND');
    }

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      reportId: report.id,
    };

    if (query.minSimilarity !== undefined) {
      where.similarity = { gte: query.minSimilarity };
    }

    if (query.language) {
      where.language = query.language;
    }

    const [pairs, total] = await Promise.all([
      this.prisma.copycatPair.findMany({
        where,
        orderBy: { similarity: 'desc' },
        skip,
        take: limit,
        include: {
          leftUser: {
            select: { id: true, username: true, nickname: true },
          },
          rightUser: {
            select: { id: true, username: true, nickname: true },
          },
        },
      }),
      this.prisma.copycatPair.count({ where }),
    ]);

    const defaultUser = { id: 0, username: 'Unknown', nickname: null };
    return {
      pairs: pairs.map((p) => ({
        id: p.id,
        leftUser: p.leftUser ?? defaultUser,
        rightUser: p.rightUser ?? defaultUser,
        language: p.language,
        similarity: p.similarity,
        longestFragment: p.longestFragment,
        totalOverlap: p.totalOverlap,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a copycat report
   */
  async deleteReport(
    courseId: number,
    problemId: string,
    userId: number,
  ): Promise<void> {
    await this.validatePermission(courseId, userId);

    const report = await this.prisma.copycatReport.findUnique({
      where: { courseId_problemId: { courseId, problemId } },
    });

    if (!report) {
      throw new NotFoundException('COPYCAT_REPORT_NOT_FOUND');
    }

    // Don't allow deleting running reports
    if (
      report.status === CopycatStatus.PENDING ||
      report.status === CopycatStatus.RUNNING
    ) {
      throw new ConflictException('CANNOT_DELETE_RUNNING_REPORT');
    }

    // Delete report (cascade will delete pairs)
    await this.prisma.copycatReport.delete({
      where: { id: report.id },
    });
  }

  /**
   * Get pair detail with source code for comparison
   */
  async getPairDetail(
    courseId: number,
    problemId: string,
    pairId: string,
    userId: number,
  ): Promise<CopycatPairDetailDto | null> {
    await this.validatePermission(courseId, userId);

    // Get the pair with submission IDs
    const pair = await this.prisma.copycatPair.findFirst({
      where: {
        id: pairId,
        report: {
          courseId,
          problemId,
        },
      },
      include: {
        leftUser: {
          select: { id: true, username: true, nickname: true },
        },
        rightUser: {
          select: { id: true, username: true, nickname: true },
        },
      },
    });

    if (!pair) {
      return null;
    }

    // Fetch source code for both submissions
    let leftCode = '';
    let rightCode = '';

    if (pair.leftSubmissionId) {
      const leftSubmission = await this.prisma.submission.findUnique({
        where: { id: pair.leftSubmissionId },
        select: { sourceKey: true },
      });
      if (leftSubmission?.sourceKey) {
        try {
          leftCode = await this.minio.getObjectAsString(
            'noj-submissions',
            leftSubmission.sourceKey,
          );
        } catch {
          leftCode = '// Failed to load source code';
        }
      }
    }

    if (pair.rightSubmissionId) {
      const rightSubmission = await this.prisma.submission.findUnique({
        where: { id: pair.rightSubmissionId },
        select: { sourceKey: true },
      });
      if (rightSubmission?.sourceKey) {
        try {
          rightCode = await this.minio.getObjectAsString(
            'noj-submissions',
            rightSubmission.sourceKey,
          );
        } catch {
          rightCode = '// Failed to load source code';
        }
      }
    }

    const defaultUser = { id: 0, username: 'Unknown', nickname: null };
    return {
      id: pair.id,
      leftUser: pair.leftUser ?? defaultUser,
      rightUser: pair.rightUser ?? defaultUser,
      leftCode,
      rightCode,
      language: pair.language,
      similarity: pair.similarity,
      longestFragment: pair.longestFragment,
      totalOverlap: pair.totalOverlap,
    };
  }

  /**
   * Validate that user has TA/Teacher permission in the course
   */
  private async validatePermission(
    courseId: number,
    userId: number,
  ): Promise<void> {
    const member = await this.prisma.courseMember.findUnique({
      where: {
        courseId_userId: { courseId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('NOT_COURSE_MEMBER');
    }

    if (member.roleInCourse === CourseRole.STUDENT) {
      throw new ForbiddenException('COPYCAT_PERMISSION_DENIED');
    }
  }
}
