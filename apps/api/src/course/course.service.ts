import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditResult,
  Course,
  CourseEnrollmentType,
  CourseRole,
  CourseStatus,
  ProblemVisibility,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload';
import { CourseQueryDto } from './dto/course-query.dto';
import { CourseDetailDto } from './dto/course-detail.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AddCourseMembersDto } from './dto/add-course-members.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import {
  CourseMemberResponseDto,
  UpdateCourseMemberRoleDto,
} from './dto/course-member.dto';
import { DeleteCourseDto } from './dto/delete-course.dto';
import { buildCsv } from '../common/csv';
import { CourseProblemQueryDto } from './dto/course-problem-query.dto';
import { CreateCourseProblemDto } from './dto/create-course-problem.dto';
import { UpdateCourseProblemDto } from './dto/update-course-problem.dto';
import { CloneProblemToCourseDto } from './dto/clone-problem-to-course.dto';
import {
  mapProblemWithOwner,
  problemWithOwnerInclude,
} from '../problem/problem.mapper';
import { ExamService } from '../exam/exam.service';

type RequestMeta = { ip?: string; userAgent?: string };

type CourseSummarySource = Course & {
  teacher: { id: number; username: string; nickname: string | null } | null;
  members?: { roleInCourse: CourseRole }[];
};

type CourseMemberWithUser = Prisma.CourseMemberGetPayload<{
  include: { user: { select: { id: true; username: true; nickname: true } } };
}>;

const DELETED_COURSE_SLUG_PREFIX = 'deleted-';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ExamService))
    private readonly examService: ExamService,
  ) {}

  private async generateDisplayId(): Promise<string> {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    while (true) {
      const first = letters[Math.floor(Math.random() * letters.length)];
      const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const id = `${first}${digits}`;

      const existing = await this.prisma.problem.findUnique({
        where: { displayId: id },
        select: { id: true },
      });

      if (!existing) return id;
    }
  }

  async listCourses(query: CourseQueryDto, viewer?: JwtPayload) {
    const status = query.status ?? CourseStatus.ACTIVE;
    const mine = query.mine ?? false;
    const term = query.term?.trim();
    const includeTokens = query.include
      ? query.include
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
      : [];
    const includeProblemCount = includeTokens.includes('problemCount');

    const where: Prisma.CourseWhereInput = {
      status,
      slug: { not: { startsWith: DELETED_COURSE_SLUG_PREFIX } },
    };

    // Build AND conditions
    const andConditions: Prisma.CourseWhereInput[] = [];

    if (mine) {
      if (!viewer) {
        throw new UnauthorizedException('請先登入');
      }
      where.members = { some: { userId: viewer.sub, leftAt: null } };
    } else {
      // For public listing: show courses that are public listed OR user is a member
      if (viewer) {
        andConditions.push({
          OR: [
            { isPublicListed: true },
            { members: { some: { userId: viewer.sub, leftAt: null } } },
          ],
        });
      } else {
        where.isPublicListed = true;
      }
    }

    if (term) {
      andConditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { teacher: { nickname: { contains: term, mode: 'insensitive' } } },
          { teacher: { username: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        teacher: { select: { id: true, username: true, nickname: true } },
        members: viewer
          ? {
              where: { userId: viewer.sub, leftAt: null },
              select: { roleInCourse: true },
            }
          : false,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const counts = await this.prisma.courseMember.groupBy({
      by: ['courseId'],
      where: {
        courseId: { in: courses.map((c) => c.id) },
        leftAt: null,
      },
      _count: { _all: true },
    });
    const memberCountMap = new Map(
      counts.map((c) => [c.courseId, c._count._all]),
    );

    const problemCountMap =
      includeProblemCount && courses.length > 0
        ? new Map(
            (
              await this.prisma.courseProblem.groupBy({
                by: ['courseId'],
                where: { courseId: { in: courses.map((c) => c.id) } },
                _count: { _all: true },
              })
            ).map((c) => [c.courseId, c._count._all]),
          )
        : undefined;

    return courses.map((course) =>
      this.toCourseSummary(course, {
        viewer,
        memberRole: course.members?.[0]?.roleInCourse,
        memberCount: memberCountMap.get(course.id),
        problemCount: problemCountMap?.get(course.id),
      }),
    );
  }

  async listAllCourseProblems(
    query: CourseProblemQueryDto,
    viewer: JwtPayload,
  ) {
    const { q, difficulty, page = 1, pageSize = 20 } = query;
    const courseSlug = query.courseSlug;

    const userCourses = await this.prisma.courseMember.findMany({
      where: { userId: viewer.sub, leftAt: null },
      select: { courseId: true },
    });

    if (userCourses.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const courseIds = userCourses.map((c) => c.courseId);

    let filteredCourseIds = courseIds;
    if (courseSlug) {
      const course = await this.prisma.course.findUnique({
        where: { slug: courseSlug },
        select: { id: true },
      });
      if (!course || !courseIds.includes(course.id)) {
        return { items: [], total: 0, page, pageSize };
      }
      filteredCourseIds = [course.id];
    }

    const problemConditions: Prisma.ProblemWhereInput = {};
    if (q) {
      problemConditions.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { displayId: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (difficulty) {
      problemConditions.difficulty = difficulty;
    }

    const where: Prisma.CourseProblemWhereInput = {
      courseId: { in: filteredCourseIds },
      problem: problemConditions,
    };

    const [courseProblems, total] = await this.prisma.$transaction([
      this.prisma.courseProblem.findMany({
        where,
        orderBy: [{ courseId: 'asc' }, { addedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          problem: {
            include: problemWithOwnerInclude,
          },
          course: {
            select: { id: true, slug: true, name: true, term: true },
          },
        },
      }),
      this.prisma.courseProblem.count({ where }),
    ]);

    const problemMap = new Map<
      string,
      {
        problem: any;
        courses: Array<{
          id: number;
          slug: string;
          name: string;
          term: string;
        }>;
      }
    >();

    for (const cp of courseProblems) {
      if (!cp.course.slug) continue;

      if (!problemMap.has(cp.problemId)) {
        problemMap.set(cp.problemId, {
          problem: mapProblemWithOwner(cp.problem, viewer.sub),
          courses: [],
        });
      }
      const entry = problemMap.get(cp.problemId)!;
      if (!entry.courses.find((c) => c.id === cp.course.id)) {
        entry.courses.push({
          id: cp.course.id,
          slug: cp.course.slug,
          name: cp.course.name,
          term: cp.course.term,
        });
      }
    }

    const items = Array.from(problemMap.values()).map((entry) => ({
      ...entry.problem,
      courses: entry.courses,
    }));

    return { items, total, page, pageSize };
  }

  async listCourseProblems(
    courseSlug: string,
    query: CourseProblemQueryDto,
    viewer: JwtPayload,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course } = await this.getCourseWithViewer(courseId, viewer);
    const { q, difficulty, page = 1, pageSize = 20 } = query;

    const problemConditions: Prisma.ProblemWhereInput = {};
    if (q) {
      problemConditions.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { displayId: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (difficulty) {
      problemConditions.difficulty = difficulty;
    }

    const where: Prisma.CourseProblemWhereInput = {
      courseId,
      problem: problemConditions,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courseProblem.findMany({
        where,
        orderBy: { addedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          problem: {
            include: problemWithOwnerInclude,
          },
        },
      }),
      this.prisma.courseProblem.count({ where }),
    ]);

    return {
      course: {
        id: course.id,
        name: course.name,
        term: course.term,
        status: course.status,
      },
      items: items.map((item) => ({
        ...mapProblemWithOwner(item.problem, viewer.sub),
        courseSettings: {
          quota: item.quota,
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async getCourseProblemDetail(
    courseSlug: string,
    problemId: string,
    viewer: JwtPayload,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course } = await this.getCourseWithViewer(courseId, viewer);

    const courseProblem = await this.prisma.courseProblem.findFirst({
      where: {
        courseId,
        problem: { OR: [{ id: problemId }, { displayId: problemId }] },
      },
      include: {
        problem: { include: problemWithOwnerInclude },
      },
    });

    if (!courseProblem) {
      throw new NotFoundException('Problem not found');
    }

    return {
      course: {
        id: course.id,
        slug: course.slug ?? courseSlug,
        name: course.name,
        term: course.term,
      },
      problem: mapProblemWithOwner(courseProblem.problem, viewer.sub),
      courseSettings: {
        quota: courseProblem.quota,
      },
    };
  }

  async createCourseProblem(
    courseSlug: string,
    dto: CreateCourseProblemDto,
    viewer: JwtPayload,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, memberRole } = await this.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isStaffRole(memberRole) && !this.isAdmin(viewer)) {
      throw new ForbiddenException('只有教師或助教可以新增題目');
    }

    const displayId = await this.generateDisplayId();
    const visibility = ProblemVisibility.UNLISTED;
    const sampleInputs = dto.sampleCases.map((c) => c.input);
    const sampleOutputs = dto.sampleCases.map((c) => c.output);
    const quota = dto.quota ?? -1;

    const created = await this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          displayId,
          ownerId: viewer.sub,
          visibility,
          difficulty: dto.difficulty,
          tags: dto.tags ?? [],
          allowedLanguages: dto.allowedLanguages,
          canViewStdout: dto.canViewStdout,
          title: dto.title.trim(),
          description: dto.description.trim(),
          input: dto.input.trim(),
          output: dto.output.trim(),
          hint: dto.hint?.trim() || undefined,
          sampleInputs,
          sampleOutputs,
        },
        include: {
          owner: { select: { id: true, username: true, nickname: true } },
        },
      });

      await tx.courseProblem.create({
        data: {
          courseId,
          problemId: problem.id,
          addedById: viewer.sub,
          quota,
        },
      });

      return problem;
    });

    return {
      course: {
        id: course.id,
        slug: course.slug ?? courseSlug,
        name: course.name,
        term: course.term,
      },
      problem: mapProblemWithOwner(created, viewer.sub),
      courseSettings: {
        quota,
      },
    };
  }

  async cloneProblemToCourse(
    courseSlug: string,
    dto: CloneProblemToCourseDto,
    viewer: JwtPayload,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, memberRole } = await this.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isStaffRole(memberRole) && !this.isAdmin(viewer)) {
      throw new ForbiddenException('只有教師或助教可以新增題目');
    }

    // Find the source problem
    const sourceProblem = await this.prisma.problem.findFirst({
      where: {
        OR: [{ id: dto.sourceProblemId }, { displayId: dto.sourceProblemId }],
      },
    });

    if (!sourceProblem) {
      throw new NotFoundException('找不到來源題目');
    }

    // Only allow cloning PUBLIC problems
    if (sourceProblem.visibility !== ProblemVisibility.PUBLIC) {
      throw new ForbiddenException('只能複製公開題目');
    }

    // Check if this problem is already linked to the course
    const existingLink = await this.prisma.courseProblem.findUnique({
      where: {
        courseId_problemId: { courseId, problemId: sourceProblem.id },
      },
    });

    if (existingLink) {
      throw new BadRequestException('此題目已存在於課程中');
    }

    const displayId = await this.generateDisplayId();
    const quota = dto.quota ?? -1;

    const created = await this.prisma.$transaction(async (tx) => {
      // Create a copy of the problem
      const problem = await tx.problem.create({
        data: {
          displayId,
          ownerId: viewer.sub,
          visibility: ProblemVisibility.UNLISTED,
          difficulty: sourceProblem.difficulty,
          tags: sourceProblem.tags,
          allowedLanguages: sourceProblem.allowedLanguages,
          canViewStdout: sourceProblem.canViewStdout,
          title: sourceProblem.title,
          description: sourceProblem.description,
          input: sourceProblem.input,
          output: sourceProblem.output,
          hint: sourceProblem.hint,
          sampleInputs: sourceProblem.sampleInputs,
          sampleOutputs: sourceProblem.sampleOutputs,
        },
        include: {
          owner: { select: { id: true, username: true, nickname: true } },
        },
      });

      // Link to course
      await tx.courseProblem.create({
        data: {
          courseId,
          problemId: problem.id,
          addedById: viewer.sub,
          quota,
        },
      });

      return problem;
    });

    return {
      course: {
        id: course.id,
        slug: course.slug ?? courseSlug,
        name: course.name,
        term: course.term,
      },
      problem: mapProblemWithOwner(created, viewer.sub),
      courseSettings: {
        quota,
      },
      clonedFrom: {
        id: sourceProblem.id,
        displayId: sourceProblem.displayId,
        title: sourceProblem.title,
      },
    };
  }

  async updateCourseProblem(
    courseSlug: string,
    problemId: string,
    dto: UpdateCourseProblemDto,
    viewer: JwtPayload,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, memberRole } = await this.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (!this.isStaffRole(memberRole) && !this.isAdmin(viewer)) {
      throw new ForbiddenException('只有教師或助教可以更新題目');
    }

    const courseProblem = await this.prisma.courseProblem.findFirst({
      where: {
        courseId,
        problem: { OR: [{ id: problemId }, { displayId: problemId }] },
      },
      include: { problem: { include: problemWithOwnerInclude } },
    });

    if (!courseProblem) {
      throw new NotFoundException('Problem not found');
    }

    const existingProblem = courseProblem.problem;
    const nextVisibility = ProblemVisibility.UNLISTED;
    const quota = dto.quota ?? courseProblem.quota;
    const sampleInputs =
      dto.sampleCases?.map((c) => c.input) ?? existingProblem.sampleInputs;
    const sampleOutputs =
      dto.sampleCases?.map((c) => c.output) ?? existingProblem.sampleOutputs;
    const updated = await this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.update({
        where: { id: existingProblem.id },
        data: {
          visibility: nextVisibility,
          difficulty: dto.difficulty ?? existingProblem.difficulty,
          tags: dto.tags !== undefined ? dto.tags : existingProblem.tags,
          allowedLanguages:
            dto.allowedLanguages ?? existingProblem.allowedLanguages,
          canViewStdout:
            typeof dto.canViewStdout === 'boolean'
              ? dto.canViewStdout
              : existingProblem.canViewStdout,
          title: dto.title ?? existingProblem.title,
          description: dto.description ?? existingProblem.description,
          input: dto.input ?? existingProblem.input,
          output: dto.output ?? existingProblem.output,
          hint: dto.hint !== undefined ? dto.hint : existingProblem.hint,
          sampleInputs,
          sampleOutputs,
        },
        include: {
          owner: { select: { id: true, username: true, nickname: true } },
        },
      });

      await tx.courseProblem.update({
        where: {
          courseId_problemId: { courseId, problemId: existingProblem.id },
        },
        data: { quota },
      });

      return problem;
    });

    return {
      course: {
        id: course.id,
        slug: course.slug ?? courseSlug,
        name: course.name,
        term: course.term,
      },
      problem: mapProblemWithOwner(updated, viewer.sub),
      courseSettings: {
        quota,
      },
    };
  }

  async getDetail(
    courseSlug: string,
    userId: number | null,
  ): Promise<CourseDetailDto> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    return this.getDetailByCourseId(courseId, userId);
  }

  private async getDetailByCourseId(
    courseId: number,
    userId: number | null,
  ): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        members: {
          where: { leftAt: null, roleInCourse: CourseRole.TEACHER },
          include: {
            user: { select: { id: true, username: true, nickname: true } },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const [memberCount, homeworkCount] = await Promise.all([
      this.countActiveMembers(courseId),
      this.prisma.homework.count({ where: { courseId } }),
    ]);
    const membership = userId
      ? await this.prisma.courseMember.findUnique({
          where: { courseId_userId: { courseId, userId } },
          select: { roleInCourse: true, leftAt: true },
        })
      : null;

    const teachers = course.members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      nickname: member.user.nickname,
    }));

    const myRole =
      membership && membership.leftAt === null ? membership.roleInCourse : null;

    return {
      id: course.id,
      slug: course.slug!,
      name: course.name,
      term: course.term,
      description: course.description ?? null,
      status: course.status,
      enrollmentType: course.enrollmentType,
      teachers,
      memberCount,
      myRole,
      homeworkCount,
      submissionCount: 0,
    };
  }

  async getStats(
    courseSlug: string,
    userId: number,
  ): Promise<{
    memberCount: number;
    problemCount: number;
    homeworkCount: number;
    totalSubmissions: number;
    myProgress?: {
      solvedCount: number;
      attemptedCount: number;
      submissionCount: number;
    };
    recentActivity?: {
      submissionsToday: number;
      activeStudents: number;
    };
  }> {
    const courseId = await this.getCourseIdBySlug(courseSlug);

    // Check if user is a member
    const membership = await this.prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId } },
      select: { roleInCourse: true, leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('Not a member of this course');
    }

    const myRole = membership.roleInCourse;
    const isStaff = myRole === CourseRole.TEACHER || myRole === CourseRole.TA;

    // Get basic counts
    const [memberCount, problemCount, homeworkCount, totalSubmissions] =
      await Promise.all([
        this.countActiveMembers(courseId),
        this.prisma.courseProblem.count({ where: { courseId } }),
        this.prisma.homework.count({ where: { courseId } }),
        this.prisma.submission.count({ where: { courseId } }),
      ]);

    const result: {
      memberCount: number;
      problemCount: number;
      homeworkCount: number;
      totalSubmissions: number;
      myProgress?: {
        solvedCount: number;
        attemptedCount: number;
        submissionCount: number;
      };
      recentActivity?: {
        submissionsToday: number;
        activeStudents: number;
      };
    } = {
      memberCount,
      problemCount,
      homeworkCount,
      totalSubmissions,
    };

    // Student-specific progress
    if (myRole === CourseRole.STUDENT) {
      const [mySubmissionCount, solvedProblems] = await Promise.all([
        this.prisma.submission.count({
          where: { courseId, userId },
        }),
        this.prisma.submission.findMany({
          where: {
            courseId,
            userId,
            status: 'AC',
          },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
      ]);

      const attemptedProblems = await this.prisma.submission.findMany({
        where: { courseId, userId },
        select: { problemId: true },
        distinct: ['problemId'],
      });

      result.myProgress = {
        solvedCount: solvedProblems.length,
        attemptedCount: attemptedProblems.length,
        submissionCount: mySubmissionCount,
      };
    }

    // Staff-specific activity
    if (isStaff) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [submissionsToday, activeStudentsData] = await Promise.all([
        this.prisma.submission.count({
          where: {
            courseId,
            createdAt: { gte: today },
          },
        }),
        this.prisma.submission.findMany({
          where: {
            courseId,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      result.recentActivity = {
        submissionsToday,
        activeStudents: activeStudentsData.length,
      };
    }

    return result;
  }

  async createCourse(
    dto: CreateCourseDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ) {
    // Check slug uniqueness
    const existingSlug = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Slug already exists');
    }

    const enrollmentType = dto.enrollmentType ?? CourseEnrollmentType.INVITE_ONLY;
    const joinToken =
      enrollmentType === CourseEnrollmentType.BY_LINK
        ? this.generateJoinToken()
        : null;
    const isPublicListed = dto.isPublicListed ?? false;
    const name = dto.name.trim();
    const term = dto.term?.trim() ?? '';
    const code = this.generateCourseCode(name, term);

    const course = await this.prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          code,
          slug: dto.slug,
          name,
          term,
          description: dto.description?.trim() || undefined,
          status: CourseStatus.ACTIVE,
          enrollmentType,
          joinToken,
          isPublicListed,
          teacherId: viewer.sub,
          createdById: viewer.sub,
        },
      });

      await tx.courseMember.create({
        data: {
          courseId: created.id,
          userId: viewer.sub,
          roleInCourse: CourseRole.TEACHER,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_CREATE,
          userId: viewer.sub,
          courseId: created.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      return created;
    });

    return this.getCourseSummary(course.id, viewer);
  }

  async updateCourse(
    courseSlug: string,
    dto: UpdateCourseDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { select: { id: true, username: true, nickname: true } },
        members: {
          where: { userId: viewer.sub, leftAt: null },
          select: { roleInCourse: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const isAdmin = this.isAdmin(viewer);
    const role = course.members?.[0]?.roleInCourse;
    if (!isAdmin && !role) {
      throw new ForbiddenException('你不是此課程成員');
    }
    if (!isAdmin && !this.isStaffRole(role)) {
      throw new ForbiddenException('無權限修改課程');
    }
    if (role === CourseRole.TA) {
      if (dto.enrollmentType || dto.term || dto.isPublicListed !== undefined) {
        throw new ForbiddenException('助教不可調整加入方式或學期');
      }
    }

    // Check slug uniqueness if slug is being updated
    if (dto.slug !== undefined && dto.slug !== course.slug) {
      const existingSlug = await this.prisma.course.findUnique({
        where: { slug: dto.slug },
      });
      if (existingSlug) {
        throw new ConflictException('Slug already exists');
      }
    }

    const updates: Prisma.CourseUpdateInput = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.slug !== undefined) updates.slug = dto.slug;
    if (dto.term !== undefined) updates.term = dto.term.trim();
    if (dto.description !== undefined)
      updates.description = dto.description.trim();
    if (dto.isPublicListed !== undefined) {
      updates.isPublicListed = dto.isPublicListed;
    }
    if (dto.enrollmentType !== undefined) {
      updates.enrollmentType = dto.enrollmentType;
      if (dto.enrollmentType === CourseEnrollmentType.BY_LINK) {
        // Generate new token if not already set
        if (!course.joinToken) {
          updates.joinToken = this.generateJoinToken();
        }
      } else {
        updates.joinToken = null;
      }
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: updates,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.COURSE_UPDATE,
        userId: viewer.sub,
        courseId,
        result: AuditResult.SUCCESS,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    const memberRole = course.members?.[0]?.roleInCourse;
    const memberCount =
      this.isStaffRole(memberRole) || isAdmin
        ? await this.countActiveMembers(courseId)
        : undefined;

    return this.toCourseSummary(
      { ...updated, teacher: course.teacher },
      { viewer, memberRole, memberCount },
    );
  }

  async archiveCourse(
    courseSlug: string,
    viewer: JwtPayload,
    meta: RequestMeta,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, memberRole } = await this.getCourseWithViewer(
      courseId,
      viewer,
    );
    const isAdmin = this.isAdmin(viewer);
    if (!isAdmin && memberRole !== CourseRole.TEACHER) {
      throw new ForbiddenException('只有管理員或授課老師可以封存課程');
    }

    if (course.status !== CourseStatus.ARCHIVED) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.ARCHIVED },
      });

      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.COURSE_ARCHIVE,
          userId: viewer.sub,
          courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    }

    return this.getCourseSummary(courseId, viewer);
  }

  async deleteCourse(
    courseSlug: string,
    dto: DeleteCourseDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, memberRole } = await this.getCourseWithViewer(
      courseId,
      viewer,
    );

    if (memberRole !== CourseRole.TEACHER) {
      throw new ForbiddenException('只有授課老師可以刪除課程');
    }

    const expectedName = course.name.trim();
    const confirmName = dto.confirmName.trim();
    if (confirmName !== expectedName) {
      throw new BadRequestException({
        code: 'COURSE_DELETE_CONFIRMATION_MISMATCH',
        message: '課程名稱確認失敗，請輸入正確的課程名稱',
      });
    }

    const deletedSlug = this.generateDeletedCourseSlug(courseId);
    const deletedCode = this.generateDeletedCourseCode(courseId);
    const originalSlug = course.slug;
    const originalCode = course.code;

    await this.prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.ARCHIVED,
          joinToken: null,
          slug: deletedSlug,
          code: deletedCode,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_ARCHIVE,
          userId: viewer.sub,
          courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: {
            delete: true,
            originalSlug,
            originalCode,
            deletedSlug,
            deletedCode,
            courseName: course.name,
          },
        },
      });
    });

    return { ok: true };
  }

  async listMembers(
    courseSlug: string,
    viewer: JwtPayload,
  ): Promise<CourseMemberResponseDto[]> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { members, membership } = await this.getCourseWithActiveMembers(
      courseId,
      viewer.sub,
    );

    // Only staff (Teacher/TA) or admin can view member list
    const isAdmin = this.isAdmin(viewer);
    if (!isAdmin && !this.isStaffRole(membership.roleInCourse)) {
      throw new ForbiddenException('只有老師或助教可以查看課程成員');
    }

    return this.buildMemberResponses(members, viewer);
  }

  async listCourseLoginAudits(
    slug: string,
    viewer: JwtPayload,
    query: {
      startAt?: string;
      endAt?: string;
      result?: AuditResult;
      userId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const courseId = await this.getCourseIdBySlug(slug);
    const { memberRole } = await this.getCourseWithViewer(courseId, viewer);
    if (!this.isAdmin(viewer) && !this.isStaffRole(memberRole)) {
      throw new ForbiddenException('無法查看課程稽核資料');
    }

    const members = await this.prisma.courseMember.findMany({
      where: { courseId, leftAt: null },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) {
      return this.emptyPagedResult();
    }

    if (query.userId && !memberIds.includes(query.userId)) {
      return this.emptyPagedResult();
    }

    const page = this.clampInt(query.page ?? 1, 1, 1_000_000);
    const limit = this.clampInt(query.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      action: AuditAction.LOGIN,
      userId: { in: memberIds },
    };

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.result) {
      where.result = query.result;
    }

    const createdAt = this.buildCreatedAtFilter(query.startAt, query.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          result: true,
          ip: true,
          userAgent: true,
          detail: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listCourseSubmissionAudits(
    slug: string,
    viewer: JwtPayload,
    query: {
      startAt?: string;
      endAt?: string;
      userId?: number;
      homeworkId?: string;
      problemId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const courseId = await this.getCourseIdBySlug(slug);
    const { memberRole } = await this.getCourseWithViewer(courseId, viewer);
    if (!this.isAdmin(viewer) && !this.isStaffRole(memberRole)) {
      throw new ForbiddenException('無法查看課程稽核資料');
    }

    const page = this.clampInt(query.page ?? 1, 1, 1_000_000);
    const limit = this.clampInt(query.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {
      courseId,
    };

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.homeworkId) {
      where.homeworkId = query.homeworkId;
    }
    if (query.status) {
      where.status = query.status as any;
    }

    if (query.problemId) {
      const byDisplayId = await this.prisma.problem.findUnique({
        where: { displayId: query.problemId },
        select: { id: true },
      });
      if (byDisplayId) {
        where.problemId = byDisplayId.id;
      } else {
        const byId = await this.prisma.problem.findUnique({
          where: { id: query.problemId },
          select: { id: true },
        });
        if (byId) {
          where.problemId = byId.id;
        } else {
          return this.emptyPagedResult('submissions');
        }
      }
    }

    const createdAt = this.buildCreatedAtFilter(query.startAt, query.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
          problem: {
            select: {
              displayId: true,
              title: true,
            },
          },
          homework: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async exportCourseLoginAuditsCsv(
    slug: string,
    viewer: JwtPayload,
    query: {
      startAt?: string;
      endAt?: string;
      result?: AuditResult;
      userId?: number;
      limit?: number;
    },
  ) {
    const courseId = await this.getCourseIdBySlug(slug);
    const { memberRole } = await this.getCourseWithViewer(courseId, viewer);
    if (!this.isAdmin(viewer) && !this.isStaffRole(memberRole)) {
      throw new ForbiddenException('無法查看課程稽核資料');
    }

    const members = await this.prisma.courseMember.findMany({
      where: { courseId, leftAt: null },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) {
      return buildCsv(
        [['timestamp', 'username', 'email', 'role', 'ip', 'result']],
        { includeBom: true },
      );
    }

    if (query.userId && !memberIds.includes(query.userId)) {
      return buildCsv(
        [['timestamp', 'username', 'email', 'role', 'ip', 'result']],
        { includeBom: true },
      );
    }

    const where: Prisma.AuditLogWhereInput = {
      action: AuditAction.LOGIN,
      userId: { in: memberIds },
    };
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.result) {
      where.result = query.result;
    }
    const createdAt = this.buildCreatedAtFilter(query.startAt, query.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const limit = this.clampInt(query.limit ?? 5000, 1, 20000);

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        createdAt: true,
        result: true,
        ip: true,
        user: {
          select: {
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const rows = [
      ['timestamp', 'username', 'email', 'role', 'ip', 'result'],
      ...logs.map((log) => [
        log.createdAt,
        log.user?.username ?? '',
        log.user?.email ?? '',
        log.user?.role ?? '',
        log.ip ?? '',
        log.result,
      ]),
    ];

    return buildCsv(rows, { includeBom: true });
  }

  async exportCourseSubmissionAuditsCsv(
    slug: string,
    viewer: JwtPayload,
    query: {
      startAt?: string;
      endAt?: string;
      userId?: number;
      homeworkId?: string;
      problemId?: string;
      status?: string;
      limit?: number;
    },
  ) {
    const courseId = await this.getCourseIdBySlug(slug);
    const { memberRole } = await this.getCourseWithViewer(courseId, viewer);
    if (!this.isAdmin(viewer) && !this.isStaffRole(memberRole)) {
      throw new ForbiddenException('無法查看課程稽核資料');
    }

    const where: Prisma.SubmissionWhereInput = {
      courseId,
    };
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.homeworkId) {
      where.homeworkId = query.homeworkId;
    }
    if (query.status) {
      where.status = query.status as any;
    }
    if (query.problemId) {
      const byDisplayId = await this.prisma.problem.findUnique({
        where: { displayId: query.problemId },
        select: { id: true },
      });
      if (byDisplayId) {
        where.problemId = byDisplayId.id;
      } else {
        const byId = await this.prisma.problem.findUnique({
          where: { id: query.problemId },
          select: { id: true },
        });
        if (byId) {
          where.problemId = byId.id;
        } else {
          return buildCsv(
            [
              [
                'timestamp',
                'username',
                'course',
                'homework',
                'problem',
                'status',
                'ip',
              ],
            ],
            { includeBom: true },
          );
        }
      }
    }
    const createdAt = this.buildCreatedAtFilter(query.startAt, query.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const limit = this.clampInt(query.limit ?? 5000, 1, 20000);

    const submissions = await this.prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        createdAt: true,
        status: true,
        ip: true,
        user: {
          select: {
            username: true,
          },
        },
        problem: {
          select: {
            displayId: true,
            title: true,
          },
        },
        homework: {
          select: {
            title: true,
          },
        },
        course: {
          select: {
            name: true,
            code: true,
            term: true,
          },
        },
      },
    });

    const rows = [
      [
        'timestamp',
        'username',
        'course',
        'homework',
        'problem',
        'status',
        'ip',
      ],
      ...submissions.map((submission) => [
        submission.createdAt,
        submission.user?.username ?? '',
        submission.course
          ? `${submission.course.name} (${submission.course.code} ${submission.course.term})`
          : '',
        submission.homework?.title ?? '',
        submission.problem
          ? `${submission.problem.displayId} ${submission.problem.title}`
          : '',
        submission.status,
        submission.ip ?? '',
      ]),
    ];

    return buildCsv(rows, { includeBom: true });
  }

  async addMembers(
    courseSlug: string,
    dto: AddCourseMembersDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ) {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const isAdmin = this.isAdmin(viewer);
    const { memberRole, course } = await this.getCourseWithViewer(
      courseId,
      viewer,
      { allowNotMember: isAdmin },
    );
    if (!isAdmin && !this.isStaffRole(memberRole)) {
      throw new ForbiddenException('只有管理員或課程老師/助教可以新增成員');
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new ForbiddenException('封存課程不可新增成員');
    }

    const teacherAdds = dto.members.filter(
      (m) => m.roleInCourse === CourseRole.TEACHER,
    );
    if (!isAdmin && memberRole === CourseRole.TA && teacherAdds.length > 0) {
      throw new ForbiddenException('助教不可新增授課老師');
    }
    if (teacherAdds.length > 1) {
      throw new BadRequestException('同一批次只允許新增一名授課老師');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingTeacher = await tx.courseMember.findFirst({
        where: { courseId, roleInCourse: CourseRole.TEACHER, leftAt: null },
      });

      if (teacherAdds.length === 1) {
        const targetTeacherId = teacherAdds[0].userId;
        if (existingTeacher && existingTeacher.userId !== targetTeacherId) {
          throw new BadRequestException(
            '此課程已存在授課老師，請先調整後再指定新的老師',
          );
        }
      }

      const outputs: Array<{ userId: number; roleInCourse: CourseRole }> = [];

      for (const member of dto.members) {
        const user = await tx.user.findUnique({ where: { id: member.userId } });
        if (!user || user.status === UserStatus.DISABLED) {
          throw new NotFoundException(`使用者 ${member.userId} 不存在或已停用`);
        }

        const existing = await tx.courseMember.findUnique({
          where: { courseId_userId: { courseId, userId: member.userId } },
        });

        const roleToAssign = member.roleInCourse;

        if (roleToAssign === CourseRole.TEACHER) {
          await tx.course.update({
            where: { id: courseId },
            data: { teacherId: member.userId },
          });
        }

        if (existing) {
          const isRoleChanged =
            existing.roleInCourse !== roleToAssign || existing.leftAt !== null;
          await tx.courseMember.update({
            where: { courseId_userId: { courseId, userId: member.userId } },
            data: {
              roleInCourse: roleToAssign,
              leftAt: null,
            },
          });

          await tx.auditLog.create({
            data: {
              action: isRoleChanged
                ? AuditAction.COURSE_MEMBER_ROLE_CHANGE
                : AuditAction.COURSE_MEMBER_ADD,
              userId: viewer.sub,
              courseId,
              result: AuditResult.SUCCESS,
              ip: meta.ip,
              userAgent: meta.userAgent,
              detail: {
                targetUserId: member.userId,
                roleInCourse: roleToAssign,
              },
            },
          });
        } else {
          await tx.courseMember.create({
            data: {
              courseId,
              userId: member.userId,
              roleInCourse: roleToAssign,
            },
          });
          await tx.auditLog.create({
            data: {
              action: AuditAction.COURSE_MEMBER_ADD,
              userId: viewer.sub,
              courseId,
              result: AuditResult.SUCCESS,
              ip: meta.ip,
              userAgent: meta.userAgent,
              detail: {
                targetUserId: member.userId,
                roleInCourse: roleToAssign,
              },
            },
          });
        }

        outputs.push({ userId: member.userId, roleInCourse: roleToAssign });
      }

      return outputs;
    });

    // 為新加入的學生生成考試代碼
    for (const member of result) {
      if (member.roleInCourse === CourseRole.STUDENT) {
        await this.examService.generateCodesForNewMember(courseId, member.userId);
      }
    }

    return result;
  }

  async updateMemberRole(
    courseSlug: string,
    targetUserId: number,
    dto: UpdateCourseMemberRoleDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseMemberResponseDto[]> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, members, membership } =
      await this.getCourseWithActiveMembers(courseId, viewer.sub);
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) {
      throw new NotFoundException('找不到該成員');
    }

    const teacherCount = this.countTeachers(members);
    const isAdmin = this.isAdmin(viewer);
    const effectiveRole = isAdmin
      ? CourseRole.TEACHER
      : membership.roleInCourse;

    this.assertCanUpdateRole({
      currentRole: effectiveRole,
      targetRole: target.roleInCourse,
      newRole: dto.role,
      teacherCount,
    });

    const updatedMembers = await this.prisma.$transaction(async (tx) => {
      await tx.courseMember.update({
        where: { courseId_userId: { courseId, userId: targetUserId } },
        data: { roleInCourse: dto.role, leftAt: null },
      });

      if (
        target.roleInCourse === CourseRole.TEACHER &&
        dto.role !== CourseRole.TEACHER
      ) {
        const fallbackTeacher = members.find(
          (member) =>
            member.userId !== targetUserId &&
            member.roleInCourse === CourseRole.TEACHER,
        );
        if (fallbackTeacher && course.teacherId === targetUserId) {
          await tx.course.update({
            where: { id: courseId },
            data: { teacherId: fallbackTeacher.userId },
          });
        }
      } else if (dto.role === CourseRole.TEACHER && !course.teacherId) {
        await tx.course.update({
          where: { id: courseId },
          data: { teacherId: targetUserId },
        });
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_MEMBER_ROLE_CHANGE,
          userId: viewer.sub,
          courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { targetUserId, roleInCourse: dto.role },
        },
      });

      return members.map((member) =>
        member.userId === targetUserId
          ? { ...member, roleInCourse: dto.role }
          : member,
      );
    });

    // 如果角色變更為學生，為其生成考試代碼
    if (dto.role === CourseRole.STUDENT && target.roleInCourse !== CourseRole.STUDENT) {
      await this.examService.generateCodesForNewMember(courseId, targetUserId);
    }

    return this.buildMemberResponses(updatedMembers, viewer);
  }

  async removeMember(
    courseSlug: string,
    targetUserId: number,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseMemberResponseDto[]> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const { course, members, membership } =
      await this.getCourseWithActiveMembers(courseId, viewer.sub);
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) {
      throw new NotFoundException('成員不存在或已移除');
    }

    if (target.userId === viewer.sub) {
      throw new BadRequestException('Use leave course instead');
    }

    const teacherCount = this.countTeachers(members);
    const isAdmin = this.isAdmin(viewer);
    const effectiveRole = isAdmin
      ? CourseRole.TEACHER
      : membership.roleInCourse;

    this.assertCanRemove({
      currentRole: effectiveRole,
      targetRole: target.roleInCourse,
      teacherCount,
    });

    const updatedMembers = await this.prisma.$transaction(async (tx) => {
      if (target.roleInCourse === CourseRole.TEACHER && teacherCount <= 1) {
        throw new BadRequestException({
          code: 'LAST_TEACHER_CANNOT_DEMOTE_OR_REMOVE',
          message: '課程至少需要一位教師',
        });
      }

      await tx.courseMember.delete({
        where: { courseId_userId: { courseId, userId: targetUserId } },
      });

      if (
        target.roleInCourse === CourseRole.TEACHER &&
        course.teacherId === targetUserId
      ) {
        const fallbackTeacher = members.find(
          (member) =>
            member.userId !== targetUserId &&
            member.roleInCourse === CourseRole.TEACHER,
        );
        if (fallbackTeacher) {
          await tx.course.update({
            where: { id: courseId },
            data: { teacherId: fallbackTeacher.userId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_MEMBER_REMOVE,
          userId: viewer.sub,
          courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
          detail: { targetUserId },
        },
      });

      return members.filter((member) => member.userId !== targetUserId);
    });

    return this.buildMemberResponses(updatedMembers, viewer);
  }

  async joinCourse(
    courseSlug: string,
    dto: JoinCourseDto,
    viewer: JwtPayload,
    meta: RequestMeta,
  ): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.enrollmentType === CourseEnrollmentType.PUBLIC) {
      return this.joinPublic(courseSlug, viewer, meta);
    }

    throw new ForbiddenException('此課程未開放自行加入');
  }

  async getJoinLinkCourse(token: string) {
    const course = await this.prisma.course.findFirst({
      where: { joinToken: token },
      include: {
        teacher: { select: { id: true, username: true, nickname: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('無效的加入連結');
    }

    if (course.enrollmentType !== CourseEnrollmentType.BY_LINK) {
      throw new BadRequestException('此連結已失效');
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('課程已封存，無法加入');
    }

    return {
      id: course.id,
      slug: course.slug!,
      name: course.name,
      term: course.term,
      description: course.description,
      teacher: course.teacher
        ? {
            id: course.teacher.id,
            nickname: course.teacher.nickname ?? course.teacher.username,
          }
        : null,
    };
  }

  async joinByLink(
    token: string,
    viewer: JwtPayload,
    meta: RequestMeta = {},
  ): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findFirst({
      where: { joinToken: token },
    });

    if (!course) {
      throw new NotFoundException('無效的加入連結');
    }

    if (course.enrollmentType !== CourseEnrollmentType.BY_LINK) {
      throw new BadRequestException('此連結已失效');
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('課程已封存，無法加入');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.ensureMembership(tx, course.id, viewer.sub);
      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_JOIN_BY_LINK,
          userId: viewer.sub,
          courseId: course.id,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    return this.getDetailByCourseId(course.id, viewer.sub);
  }

  async joinPublic(
    courseSlug: string,
    viewer: JwtPayload,
    meta: RequestMeta = {},
  ): Promise<CourseDetailDto> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCourseJoinable(course, CourseEnrollmentType.PUBLIC);

    await this.prisma.$transaction(async (tx) => {
      await this.ensureMembership(tx, courseId, viewer.sub);
      await tx.auditLog.create({
        data: {
          action: AuditAction.COURSE_JOIN_PUBLIC,
          userId: viewer.sub,
          courseId,
          result: AuditResult.SUCCESS,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    return this.getDetailByCourseId(courseId, viewer.sub);
  }

  async leaveCourse(
    courseSlug: string,
    userId: number,
    meta: RequestMeta = {},
  ): Promise<CourseDetailDto> {
    const courseId = await this.getCourseIdBySlug(courseSlug);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const member = course.members.find((m) => m.userId === userId);

    if (!member) {
      return this.getDetailByCourseId(courseId, userId);
    }

    if (member.roleInCourse === CourseRole.TEACHER) {
      const teacherCount = course.members.filter(
        (m) => m.roleInCourse === CourseRole.TEACHER,
      ).length;
      if (teacherCount <= 1) {
        throw new BadRequestException({
          code: 'LAST_TEACHER_CANNOT_LEAVE',
          message: '你是這門課的最後一位教師，無法退出。',
        });
      }

      if (course.teacherId === userId) {
        const nextTeacher = course.members.find(
          (m) => m.roleInCourse === CourseRole.TEACHER && m.userId !== userId,
        );
        if (nextTeacher) {
          await this.prisma.course.update({
            where: { id: courseId },
            data: { teacherId: nextTeacher.userId },
          });
        }
      }
    }

    await this.prisma.courseMember.delete({
      where: { courseId_userId: { courseId, userId } },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.COURSE_LEAVE,
        userId,
        courseId,
        result: AuditResult.SUCCESS,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return this.getDetailByCourseId(courseId, userId);
  }

  private assertCourseJoinable(
    course: Course,
    expectedEnrollment: CourseEnrollmentType,
  ) {
    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('課程已封存，無法加入');
    }
    if (course.enrollmentType !== expectedEnrollment) {
      if (
        course.enrollmentType === CourseEnrollmentType.INVITE_ONLY ||
        course.enrollmentType === CourseEnrollmentType.APPROVAL
      ) {
        throw new ForbiddenException('此課程未開放自行加入');
      }
      throw new BadRequestException('此課程不支援此加入方式');
    }
  }

  private async ensureMembership(
    tx: Prisma.TransactionClient,
    courseId: number,
    userId: number,
  ) {
    const existing = await tx.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });

    if (!existing) {
      await tx.courseMember.create({
        data: {
          courseId,
          userId,
          roleInCourse: CourseRole.STUDENT,
        },
      });
      return;
    }

    if (existing.leftAt !== null) {
      await tx.courseMember.update({
        where: { courseId_userId: { courseId, userId } },
        data: { leftAt: null, roleInCourse: existing.roleInCourse },
      });
    }
  }

  private async getCourseWithActiveMembers(
    courseId: number,
    userId: number,
  ): Promise<{
    course: Course;
    members: CourseMemberWithUser[];
    membership: CourseMemberWithUser;
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, username: true, nickname: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const membership = course.members.find(
      (member) => member.userId === userId,
    );
    if (!membership) {
      throw new ForbiddenException('非該課程成員不能存取此資料');
    }

    return { course, members: course.members, membership };
  }

  private buildMemberResponses(
    members: CourseMemberWithUser[],
    viewer: JwtPayload,
  ): CourseMemberResponseDto[] {
    const teacherCount = this.countTeachers(members);
    const membership = members.find((member) => member.userId === viewer.sub);
    const currentRole = this.isAdmin(viewer)
      ? CourseRole.TEACHER
      : (membership?.roleInCourse ?? null);

    return members.map((member) => {
      const permissions = this.computeMemberPermissions({
        currentRole,
        targetRole: member.roleInCourse,
        teacherCount,
        isSelf: member.userId === viewer.sub,
        isAdmin: this.isAdmin(viewer),
      });

      return {
        id: String(member.userId),
        userId: member.userId,
        courseId: member.courseId,
        role: member.roleInCourse,
        joinedAt: member.joinedAt,
        user: {
          id: member.user.id,
          username: member.user.username,
          nickname: member.user.nickname,
        },
        canEditRole: permissions.canEditRole,
        canRemove: permissions.canRemove,
      };
    });
  }

  private computeMemberPermissions(params: {
    currentRole: CourseRole | null;
    targetRole: CourseRole;
    teacherCount: number;
    isSelf: boolean;
    isAdmin: boolean;
  }) {
    const effectiveRole = params.isAdmin
      ? CourseRole.TEACHER
      : params.currentRole;
    if (!effectiveRole) {
      return { canEditRole: false, canRemove: false };
    }

    if (params.isSelf) {
      if (effectiveRole === CourseRole.TEACHER && params.teacherCount > 1) {
        return { canEditRole: true, canRemove: false };
      }
      return { canEditRole: false, canRemove: false };
    }

    if (effectiveRole === CourseRole.STUDENT) {
      return { canEditRole: false, canRemove: false };
    }

    if (effectiveRole === CourseRole.TA) {
      if (params.targetRole === CourseRole.STUDENT) {
        return { canEditRole: true, canRemove: true };
      }
      return { canEditRole: false, canRemove: false };
    }

    if (params.targetRole === CourseRole.TEACHER && params.teacherCount <= 1) {
      return { canEditRole: false, canRemove: false };
    }

    return { canEditRole: true, canRemove: true };
  }

  private assertCanUpdateRole(params: {
    currentRole: CourseRole | null;
    targetRole: CourseRole;
    newRole: CourseRole;
    teacherCount: number;
  }) {
    if (!params.currentRole) {
      throw new ForbiddenException('非課程成員無法調整角色');
    }

    if (params.currentRole === CourseRole.STUDENT) {
      throw new ForbiddenException('你沒有權限調整成員角色');
    }

    if (params.currentRole === CourseRole.TA) {
      if (params.targetRole !== CourseRole.STUDENT) {
        throw new ForbiddenException('助教不可調整此成員角色');
      }
      if (params.newRole === CourseRole.TEACHER) {
        throw new ForbiddenException('助教不可提升為老師');
      }
      return;
    }

    if (
      params.targetRole === CourseRole.TEACHER &&
      params.newRole !== CourseRole.TEACHER &&
      params.teacherCount <= 1
    ) {
      throw new BadRequestException({
        code: 'LAST_TEACHER_CANNOT_DEMOTE_OR_REMOVE',
        message: '課程至少需要一位教師',
      });
    }
  }

  private assertCanRemove(params: {
    currentRole: CourseRole | null;
    targetRole: CourseRole;
    teacherCount: number;
  }) {
    if (!params.currentRole) {
      throw new ForbiddenException('非課程成員無法移除此成員');
    }
    if (params.currentRole === CourseRole.STUDENT) {
      throw new ForbiddenException('你沒有權限移除成員');
    }
    if (params.currentRole === CourseRole.TA) {
      if (params.targetRole !== CourseRole.STUDENT) {
        throw new ForbiddenException('助教不可移除此成員');
      }
      return;
    }
    if (params.targetRole === CourseRole.TEACHER && params.teacherCount <= 1) {
      throw new BadRequestException({
        code: 'LAST_TEACHER_CANNOT_DEMOTE_OR_REMOVE',
        message: '課程至少需要一位教師',
      });
    }
  }

  private countTeachers(members: CourseMemberWithUser[]) {
    return members.filter(
      (member) => member.roleInCourse === CourseRole.TEACHER,
    ).length;
  }

  private async getCourseSummary(courseId: number, viewer?: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { select: { id: true, username: true, nickname: true } },
        members: viewer
          ? {
              where: { userId: viewer.sub, leftAt: null },
              select: { roleInCourse: true },
            }
          : false,
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const memberRole = course.members?.[0]?.roleInCourse;
    const memberCount = this.canViewStats(viewer, memberRole)
      ? await this.countActiveMembers(courseId)
      : undefined;

    return this.toCourseSummary(course, {
      viewer,
      memberRole,
      memberCount,
    });
  }

  private toCourseSummary(
    course: CourseSummarySource,
    context: {
      viewer?: JwtPayload;
      memberRole?: CourseRole;
      memberCount?: number;
      problemCount?: number;
    },
  ) {
    const canViewSensitive = this.canViewJoinCode(
      context.viewer,
      context.memberRole,
    );
    const hasStats =
      context.memberCount !== undefined || context.problemCount !== undefined;
    return {
      id: course.id,
      slug: course.slug!,
      code: course.code,
      name: course.name,
      term: course.term,
      description: course.description,
      status: course.status,
      enrollmentType: course.enrollmentType,
      isPublicListed: course.isPublicListed,
      joinToken: canViewSensitive ? course.joinToken : undefined,
      myRole: context.memberRole ?? null,
      teacher: course.teacher
        ? {
            id: course.teacher.id,
            nickname: course.teacher.nickname ?? course.teacher.username,
          }
        : null,
      stats: hasStats
        ? {
            ...(context.memberCount !== undefined
              ? { memberCount: context.memberCount }
              : {}),
            ...(context.problemCount !== undefined
              ? { problemCount: context.problemCount }
              : {}),
          }
        : undefined,
    };
  }

  async getCourseWithViewer(
    courseId: number,
    viewer: JwtPayload,
    options?: { allowNotMember?: boolean },
  ): Promise<{ course: Course; memberRole?: CourseRole }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const membership = await this.prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId: viewer.sub } },
    });

    if (
      !options?.allowNotMember &&
      !this.isAdmin(viewer) &&
      (!membership || membership.leftAt !== null)
    ) {
      throw new ForbiddenException('無法存取此課程');
    }

    const memberRole =
      membership && membership.leftAt === null
        ? membership.roleInCourse
        : undefined;
    return { course, memberRole };
  }

  private async countActiveMembers(courseId: number) {
    return this.prisma.courseMember.count({
      where: { courseId, leftAt: null },
    });
  }

  private canViewJoinCode(viewer?: JwtPayload, memberRole?: CourseRole) {
    if (!viewer) return false;
    if (this.isAdmin(viewer)) return true;
    return this.isStaffRole(memberRole);
  }

  private canViewStats(viewer?: JwtPayload, memberRole?: CourseRole) {
    if (!viewer) return false;
    if (this.isAdmin(viewer)) return true;
    return this.isStaffRole(memberRole);
  }

  private isStaffRole(role?: CourseRole) {
    return role === CourseRole.TEACHER || role === CourseRole.TA;
  }

  private isAdmin(viewer?: JwtPayload) {
    return viewer?.role === UserRole.ADMIN;
  }

  async getCourseIdBySlug(
    slug: string,
    options?: { includeDeleted?: boolean },
  ): Promise<number> {
    const course = options?.includeDeleted
      ? await this.prisma.course.findUnique({ where: { slug }, select: { id: true } })
      : await this.prisma.course.findFirst({
          where: {
            AND: [
              { slug },
              { slug: { not: { startsWith: DELETED_COURSE_SLUG_PREFIX } } },
            ],
          },
          select: { id: true },
        });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course.id;
  }

  private clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  private buildCreatedAtFilter(startAt?: string, endAt?: string) {
    const start = this.parseDate(startAt);
    const end = this.parseDate(endAt);
    if (start && end) return { gte: start, lte: end };
    if (start) return { gte: start };
    if (end) return { lte: end };
    return undefined;
  }

  private emptyPagedResult(type: 'logs' | 'submissions' = 'logs') {
    return {
      [type]: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
  }

  private generateDeletedCourseSlug(courseId: number) {
    const suffix = randomBytes(6).toString('hex');
    return `${DELETED_COURSE_SLUG_PREFIX}${courseId}-${suffix}`;
  }

  private generateDeletedCourseCode(courseId: number) {
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    const raw = `DELETED-${courseId}-${suffix}`;
    return raw.slice(0, 32);
  }

  private generateCourseCode(name: string, term?: string) {
    const namePart = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const termPart = term
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    const base = [namePart, termPart].filter(Boolean).join('-') || 'COURSE';
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    const code = `${base}-${randomPart}`;
    return code.slice(0, 32);
  }

  private ensureJoinCode(raw?: string | null) {
    const trimmed = raw?.trim();
    if (trimmed && trimmed.length >= 8) {
      return trimmed;
    }
    return this.generateJoinCode();
  }

  private generateJoinCode(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  private generateJoinToken(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    let token = '';
    for (let i = 0; i < length; i += 1) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }
}
