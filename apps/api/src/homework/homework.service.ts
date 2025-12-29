import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseRole,
  Prisma,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CourseService } from '../course/course.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import {
  CreateHomeworkDto,
  HomeworkProblemInputDto,
} from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import {
  HomeworkDetailDto,
  HomeworkListItemDto,
  HomeworkStatus,
} from './dto/homework-response.dto';

type HomeworkWithMeta = Prisma.HomeworkGetPayload<{
  include: {
    createdBy: { select: { id: true; username: true; nickname: true } };
    _count: { select: { problems: true } };
  };
}>;

type HomeworkWithProblems = Prisma.HomeworkGetPayload<{
  include: {
    createdBy: { select: { id: true; username: true; nickname: true } };
    problems: {
      orderBy: { order: 'asc' };
      select: {
        order: true;
        allowedLanguagesOverride: true;
        problem: {
          select: {
            id: true;
            displayId: true;
            title: true;
            allowedLanguages: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
  ) {}

  async listHomeworks(
    courseId: number,
    viewer: JwtPayload,
  ): Promise<HomeworkListItemDto[]> {
    await this.courseService.getCourseWithViewer(courseId, viewer);

    const records = await this.prisma.homework.findMany({
      where: { courseId },
      include: {
        createdBy: { select: { id: true, username: true, nickname: true } },
        _count: { select: { problems: true } },
      },
      orderBy: [{ endAt: 'desc' }, { startAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Get completion status for all homeworks
    const homeworkIds = records.map((hw) => hw.id);
    const completionMap = await this.getHomeworksCompletionStatus(
      homeworkIds,
      viewer.sub,
    );

    return records.map((hw) =>
      this.toListItemDto(hw, completionMap.get(hw.id) ?? 0),
    );
  }

  async getHomework(
    courseId: number,
    homeworkId: string,
    viewer: JwtPayload,
  ): Promise<HomeworkDetailDto> {
    const { memberRole } = await this.courseService.getCourseWithViewer(
      courseId,
      viewer,
    );

    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, courseId },
      include: {
        createdBy: { select: { id: true, username: true, nickname: true } },
        problems: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            allowedLanguagesOverride: true,
            problem: {
              select: {
                id: true,
                displayId: true,
                title: true,
                allowedLanguages: true,
              },
            },
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    const canManage = this.isCourseStaff(memberRole, viewer.role);

    // Get completion status for each problem
    const problemIds = homework.problems.map((hp) => hp.problem.id);
    const completedProblemIds = await this.getCompletedProblemIds(
      homeworkId,
      problemIds,
      viewer.sub,
    );

    return this.toDetailDto(homework, canManage, completedProblemIds);
  }

  async createHomework(
    courseId: number,
    viewer: JwtPayload,
    dto: CreateHomeworkDto,
  ): Promise<HomeworkDetailDto> {
    const { memberRole } = await this.courseService.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isCourseStaff(memberRole, viewer.role)) {
      throw new ForbiddenException('只有教師或助教可以新增作業');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.ensureValidTimeRange(startAt, endAt);

    const problemIds = this.validateProblemSelections(dto.problems);
    const linkedCourseProblemIds = await this.ensureProblemsAssignable(
      problemIds,
      courseId,
    );
    this.validateLanguageOverrides(dto.problems, linkedCourseProblemIds);

    const homeworkId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.homework.create({
        data: {
          courseId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          startAt,
          endAt,
          createdById: viewer.sub,
        },
      });

      await tx.homeworkProblem.createMany({
        data: dto.problems.map((problem, idx) => ({
          homeworkId: created.id,
          problemId: problem.problemId,
          order: idx,
          allowedLanguagesOverride: problem.allowedLanguagesOverride ?? [],
        })),
      });

      return created.id;
    });

    return this.getHomework(courseId, homeworkId, viewer);
  }

  async updateHomework(
    courseId: number,
    homeworkId: string,
    viewer: JwtPayload,
    dto: UpdateHomeworkDto,
  ): Promise<HomeworkDetailDto> {
    const { memberRole } = await this.courseService.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isCourseStaff(memberRole, viewer.role)) {
      throw new ForbiddenException('只有教師或助教可以編輯作業');
    }

    const existing = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });
    if (!existing || existing.courseId !== courseId) {
      throw new NotFoundException('Homework not found');
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    this.ensureValidTimeRange(startAt, endAt);

    const updateData: Prisma.HomeworkUpdateInput = {
      title: dto.title !== undefined ? dto.title.trim() : undefined,
      description:
        dto.description !== undefined ? dto.description.trim() : undefined,
      startAt,
      endAt,
    };

    if (dto.problems) {
      const problemIds = this.validateProblemSelections(dto.problems);
    const linkedCourseProblemIds = await this.ensureProblemsAssignable(
      problemIds,
      courseId,
    );
    this.validateLanguageOverrides(dto.problems, linkedCourseProblemIds);

      await this.prisma.$transaction(async (tx) => {
        await tx.homeworkProblem.deleteMany({ where: { homeworkId } });
        await tx.homeworkProblem.createMany({
          data: dto.problems!.map((p, idx: number) => ({
            homeworkId,
            problemId: p.problemId,
            order: idx,
            allowedLanguagesOverride: p.allowedLanguagesOverride ?? [],
          })),
        });
        await tx.homework.update({
          where: { id: homeworkId },
          data: updateData,
        });
      });
    } else {
      await this.prisma.homework.update({
        where: { id: homeworkId },
        data: updateData,
      });
    }

    return this.getHomework(courseId, homeworkId, viewer);
  }

  async deleteHomework(
    courseId: number,
    homeworkId: string,
    viewer: JwtPayload,
  ): Promise<void> {
    const { memberRole } = await this.courseService.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isCourseStaff(memberRole, viewer.role)) {
      throw new ForbiddenException('只有教師或助教可以刪除作業');
    }

    const existing = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      select: { id: true, courseId: true },
    });
    if (!existing || existing.courseId !== courseId) {
      throw new NotFoundException('Homework not found');
    }

    await this.prisma.homework.delete({ where: { id: homeworkId } });
  }

  private toListItemDto(
    homework: HomeworkWithMeta,
    completedCount: number,
  ): HomeworkListItemDto {
    return {
      id: homework.id,
      courseId: homework.courseId,
      title: homework.title,
      startAt: homework.startAt.toISOString(),
      endAt: homework.endAt.toISOString(),
      status: this.computeStatus(homework.startAt, homework.endAt),
      problemCount: homework._count.problems,
      completedCount,
      createdBy: homework.createdBy,
    };
  }

  private toDetailDto(
    homework: HomeworkWithProblems,
    canManage: boolean,
    completedProblemIds: Set<string>,
  ): HomeworkDetailDto {
    return {
      id: homework.id,
      courseId: homework.courseId,
      title: homework.title,
      description: homework.description,
      startAt: homework.startAt.toISOString(),
      endAt: homework.endAt.toISOString(),
      status: this.computeStatus(homework.startAt, homework.endAt),
      problems: homework.problems.map((hp) => ({
        order: hp.order,
        allowedLanguagesOverride:
          hp.allowedLanguagesOverride.length > 0 ? hp.allowedLanguagesOverride : null,
        problem: {
          id: hp.problem.id,
          displayId: hp.problem.displayId,
          title: hp.problem.title,
          allowedLanguages: hp.problem.allowedLanguages,
        },
        isCompleted: completedProblemIds.has(hp.problem.id),
      })),
      createdBy: homework.createdBy,
      canEdit: canManage,
      canDelete: canManage,
    };
  }

  private computeStatus(startAt: Date, endAt: Date): HomeworkStatus {
    const now = new Date();
    if (now < startAt) return 'UPCOMING';
    if (now > endAt) return 'ENDED';
    return 'ONGOING';
  }

  private ensureValidTimeRange(startAt: Date, endAt: Date) {
    if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt');
    }
    if (!(endAt instanceof Date) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid endAt');
    }
    if (startAt >= endAt) {
      throw new BadRequestException('開始時間必須早於結束時間');
    }
  }

  private validateProblemSelections(
    problems: HomeworkProblemInputDto[],
  ): string[] {
    if (!problems || problems.length === 0) {
      throw new BadRequestException('作業至少需要一題');
    }
    const problemIds = problems.map((p) => p.problemId);
    const uniqueIds = new Set(problemIds);
    if (uniqueIds.size !== problemIds.length) {
      throw new BadRequestException('作業題目不可重複');
    }
    return Array.from(uniqueIds);
  }

  private async ensureProblemsAssignable(
    problemIds: string[],
    courseId: number,
  ): Promise<Set<string>> {
    const problems = await this.prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true },
    });

    const foundIds = new Set(problems.map((p) => p.id));
    const missing = problemIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException({ message: '題目不存在', problemIds: missing });
    }

    const linkedCourseProblemIds = new Set<string>();
    if (problemIds.length > 0) {
      const links = await this.prisma.courseProblem.findMany({
        where: { courseId, problemId: { in: problemIds } },
        select: { problemId: true },
      });
      links.forEach((l) => linkedCourseProblemIds.add(l.problemId));
    }

    const unlinked = problemIds.filter((id) => !linkedCourseProblemIds.has(id));
    if (unlinked.length > 0) {
      throw new BadRequestException({
        message: '作業僅能使用課程題目',
        problemIds: unlinked,
      });
    }

    return linkedCourseProblemIds;
  }

  private validateLanguageOverrides(
    problems: HomeworkProblemInputDto[],
    linkedCourseProblemIds: Set<string>,
  ) {
    for (const p of problems) {
      if (!linkedCourseProblemIds.has(p.problemId)) {
        throw new BadRequestException({
          message: '作業僅能使用課程題目',
          problemId: p.problemId,
        });
      }

      if (p.allowedLanguagesOverride !== undefined) {
        throw new BadRequestException('作業不支援題目覆蓋設定');
      }
    }
  }

  private isCourseStaff(role?: CourseRole, viewerRole?: UserRole) {
    if (viewerRole === UserRole.ADMIN) return true;
    return role === CourseRole.TEACHER || role === CourseRole.TA;
  }

  /**
   * Get completion count for multiple homeworks
   * Returns a map of homeworkId -> completedCount
   */
  private async getHomeworksCompletionStatus(
    homeworkIds: string[],
    userId: number,
  ): Promise<Map<string, number>> {
    if (homeworkIds.length === 0) return new Map();

    // Get all problems for these homeworks
    const homeworkProblems = await this.prisma.homeworkProblem.findMany({
      where: { homeworkId: { in: homeworkIds } },
      select: { homeworkId: true, problemId: true },
    });

    // Group problems by homework
    const problemsByHomework = new Map<string, string[]>();
    for (const hp of homeworkProblems) {
      const problems = problemsByHomework.get(hp.homeworkId) ?? [];
      problems.push(hp.problemId);
      problemsByHomework.set(hp.homeworkId, problems);
    }

    // Get all completed problems for this user in these homeworks
    const completedSubmissions = await this.prisma.submission.findMany({
      where: {
        userId,
        homeworkId: { in: homeworkIds },
        status: SubmissionStatus.AC,
      },
      select: { homeworkId: true, problemId: true },
      distinct: ['homeworkId', 'problemId'],
    });

    // Build completion map
    const completionMap = new Map<string, Set<string>>();
    for (const sub of completedSubmissions) {
      if (!sub.homeworkId) continue;
      const completed = completionMap.get(sub.homeworkId) ?? new Set();
      completed.add(sub.problemId);
      completionMap.set(sub.homeworkId, completed);
    }

    // Count completed problems for each homework
    const resultMap = new Map<string, number>();
    for (const [homeworkId, problems] of problemsByHomework) {
      const completed = completionMap.get(homeworkId) ?? new Set();
      resultMap.set(homeworkId, completed.size);
    }

    return resultMap;
  }

  /**
   * Get completed problem IDs for a specific homework and user
   */
  private async getCompletedProblemIds(
    homeworkId: string,
    problemIds: string[],
    userId: number,
  ): Promise<Set<string>> {
    if (problemIds.length === 0) return new Set();

    const completedSubmissions = await this.prisma.submission.findMany({
      where: {
        userId,
        homeworkId,
        problemId: { in: problemIds },
        status: SubmissionStatus.AC,
      },
      select: { problemId: true },
      distinct: ['problemId'],
    });

    return new Set(completedSubmissions.map((s) => s.problemId));
  }
}
