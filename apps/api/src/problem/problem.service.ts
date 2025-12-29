import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemQueryDto } from './dto/problem-query.dto';
import { CourseRole, Prisma, ProblemVisibility, TranslationStatus } from '@prisma/client';
import { mapProblemWithOwner, problemWithOwnerInclude } from './problem.mapper';
import { TranslatorService } from '../translator/translator.service';

@Injectable()
export class ProblemService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TranslatorService))
    private readonly translatorService: TranslatorService,
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

  private ensureCanModify(problemOwnerId: number | null, currentUserId: number) {
    // If problem has no owner (null), allow modification
    if (problemOwnerId === null) return;
    if (problemOwnerId !== currentUserId) {
      throw new ForbiddenException('Only the owner can modify this problem.');
    }
  }

  private normalizeCourseIds(courseIds?: number[]) {
    if (!courseIds) return [];
    const normalized = courseIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    return Array.from(new Set(normalized));
  }

  private async ensureCourseSelections(
    courseIds: number[],
    currentUserId: number,
  ) {
    if (courseIds.length === 0) {
      throw new BadRequestException('請至少選擇一門課程');
    }

    const memberships = await this.prisma.courseMember.findMany({
      where: {
        userId: currentUserId,
        leftAt: null,
        roleInCourse: { in: [CourseRole.TEACHER, CourseRole.TA] },
        courseId: { in: courseIds },
      },
      select: { courseId: true },
    });

    const allowed = new Set(memberships.map((m) => m.courseId));
    const forbidden = courseIds.filter((id) => !allowed.has(id));
    if (forbidden.length > 0) {
      throw new ForbiddenException('只能選擇你擔任教師或助教的課程');
    }
  }

  private async canViewUnlistedProblem(
    problemId: string,
    userId: number,
  ) {
    const membership = await this.prisma.courseMember.findFirst({
      where: {
        userId,
        leftAt: null,
        course: {
          problems: {
            some: { problemId },
          },
        },
      },
      select: { courseId: true },
    });
    return Boolean(membership);
  }

  async listProblems(query: ProblemQueryDto, currentUserId?: number | null) {
    const { q, difficulty, page = 1, pageSize = 20, scope = 'public', tags } = query;

    const andConditions: Prisma.ProblemWhereInput[] = [];

    if (scope === 'public') {
      andConditions.push({ visibility: ProblemVisibility.PUBLIC });
    } else if (scope === 'mine') {
      if (!currentUserId) {
        throw new UnauthorizedException('請先登入以查看我的題目');
      }
      andConditions.push({ ownerId: currentUserId });
    }

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { displayId: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      });
    }

    if (difficulty) andConditions.push({ difficulty });

    // 標籤篩選（OR 邏輯：符合任一標籤即可）
    if (tags && tags.length > 0) {
      andConditions.push({ tags: { hasSome: tags } });
    }

    const where: Prisma.ProblemWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: problemWithOwnerInclude,
      }),
      this.prisma.problem.count({ where }),
    ]);

    return {
      items: items.map((problem) =>
        mapProblemWithOwner(problem, currentUserId),
      ),
      total,
      page,
      pageSize,
    };
  }

  async getProblemById(
    id: string,
    currentUserId?: number | null,
    homeworkId?: string,
  ) {
    const includeWithCourses = {
      ...problemWithOwnerInclude,
      courses: {
        select: {
          courseId: true,
          quota: true,
          course: { select: { slug: true } },
        },
      },
    } satisfies Prisma.ProblemInclude;

    const byDisplayId = await this.prisma.problem.findUnique({
      where: { displayId: id },
      include: includeWithCourses,
    });

    const p =
      byDisplayId ??
      (await this.prisma.problem.findUnique({
        where: { id },
        include: includeWithCourses,
      }));

    if (!p) throw new NotFoundException('Problem not found');

    // Visibility check
    const mapped = mapProblemWithOwner(p, currentUserId);
    const courseLink =
      p.visibility === ProblemVisibility.UNLISTED ? p.courses?.[0] : undefined;
    const withCourses = mapped.canEdit
      ? {
          ...mapped,
          courseIds:
            p.visibility === ProblemVisibility.UNLISTED
              ? p.courses?.map((c) => c.courseId) ?? []
              : [],
          courseContext: courseLink
            ? {
                courseId: courseLink.courseId,
                courseSlug: courseLink.course?.slug ?? null,
                quota: courseLink.quota,
              }
            : undefined,
        }
      : mapped;

    if (p.visibility === ProblemVisibility.PUBLIC) {
      // 公開題目：任何人可見
      return withCourses;
    }

    // 非公開題目：檢查權限
    if (!currentUserId) {
      throw new ForbiddenException('請先登入以查看此題目');
    }

    // 如果是擁有者
    if (currentUserId === p.ownerId) {
      return withCourses;
    }

    // 課程情境：題目被加入作業後，課程成員可在作業期間內查看
    if (homeworkId) {
      const languageOverride = await this.ensureHomeworkProblemAccess(
        homeworkId,
        p.id,
        currentUserId,
      );
      return {
        ...withCourses,
        allowedLanguages:
          languageOverride && languageOverride.length > 0
            ? languageOverride
            : withCourses.allowedLanguages,
      };
    }

    if (p.visibility === ProblemVisibility.UNLISTED) {
      const hasCourseAccess = await this.canViewUnlistedProblem(
        p.id,
        currentUserId,
      );
      if (hasCourseAccess) {
        return withCourses;
      }
    }

    // 沒有權限
    throw new ForbiddenException('你沒有權限查看此題目');
  }

  async createProblem(dto: CreateProblemDto, currentUserId: number) {
    const displayId = await this.generateDisplayId();

    const sampleInputs = dto.sampleCases.map((c) => c.input);
    const sampleOutputs = dto.sampleCases.map((c) => c.output);

    if (dto.visibility === ProblemVisibility.UNLISTED) {
      throw new BadRequestException('課程題目請在課程題庫建立');
    }
    if (dto.courseIds && dto.courseIds.length > 0) {
      throw new BadRequestException('課程題目請在課程題庫建立');
    }

    // 偵測原始語言
    const sourceLanguage = this.translatorService.detectSourceLanguage(
      dto.title + dto.description,
    );

    // 根據原始語言設定對應的雙語欄位
    const bilingualData = {
      titleZh: sourceLanguage === 'zh' ? dto.title : dto.titleZh ?? null,
      titleEn: sourceLanguage === 'en' ? dto.title : dto.titleEn ?? null,
      descriptionZh: sourceLanguage === 'zh' ? dto.description : dto.descriptionZh ?? null,
      descriptionEn: sourceLanguage === 'en' ? dto.description : dto.descriptionEn ?? null,
      inputZh: sourceLanguage === 'zh' ? dto.input : dto.inputZh ?? null,
      inputEn: sourceLanguage === 'en' ? dto.input : dto.inputEn ?? null,
      outputZh: sourceLanguage === 'zh' ? dto.output : dto.outputZh ?? null,
      outputEn: sourceLanguage === 'en' ? dto.output : dto.outputEn ?? null,
      hintZh: sourceLanguage === 'zh' ? dto.hint ?? null : dto.hintZh ?? null,
      hintEn: sourceLanguage === 'en' ? dto.hint ?? null : dto.hintEn ?? null,
      tagsZh: sourceLanguage === 'zh' ? dto.tags ?? [] : dto.tagsZh ?? [],
      tagsEn: sourceLanguage === 'en' ? dto.tags ?? [] : dto.tagsEn ?? [],
      sourceLanguage,
      translationStatus: TranslationStatus.NONE,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          displayId,
          ownerId: currentUserId,
          visibility: dto.visibility,
          difficulty: dto.difficulty,
          tags: dto.tags ?? [],
          allowedLanguages: dto.allowedLanguages,
          canViewStdout: dto.canViewStdout,
          title: dto.title,
          description: dto.description,
          input: dto.input,
          output: dto.output,
          hint: dto.hint,
          sampleInputs,
          sampleOutputs,
          ...bilingualData,
        },
        include: {
          owner: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      return problem;
    });

    // 如果勾選自動翻譯，觸發非同步翻譯
    if (dto.autoTranslate) {
      try {
        await this.translatorService.translateProblem(created.id, currentUserId);
      } catch {
        // 翻譯失敗不影響建立流程（靜默失敗）
      }
    }

    return mapProblemWithOwner(created, currentUserId);
  }

  async updateProblem(
    id: string,
    dto: UpdateProblemDto,
    currentUserId: number,
  ) {
    const existing = await this.prisma.problem.findUnique({
      where: { id },
      include: { courses: { select: { courseId: true } } },
    });
    if (!existing) throw new NotFoundException('Problem not found');

    this.ensureCanModify(existing.ownerId, currentUserId);

    if (existing.visibility === ProblemVisibility.UNLISTED) {
      throw new BadRequestException('課程題目請在課程題庫編輯');
    }

    const nextVisibility = dto.visibility ?? existing.visibility;
    if (nextVisibility === ProblemVisibility.UNLISTED) {
      throw new BadRequestException('課程題目請在課程題庫編輯');
    }
    if (dto.courseIds && dto.courseIds.length > 0) {
      throw new BadRequestException('課程題目請在課程題庫編輯');
    }

    const sampleInputs =
      dto.sampleCases?.map((c) => c.input) ?? existing.sampleInputs;
    const sampleOutputs =
      dto.sampleCases?.map((c) => c.output) ?? existing.sampleOutputs;

    // 準備雙語欄位更新
    const sourceLanguage = existing.sourceLanguage as 'zh' | 'en';
    const bilingualData: Record<string, unknown> = {};

    // 如果更新了主要語言的內容，同步更新對應的雙語欄位
    if (dto.title !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.titleZh = dto.title;
      } else {
        bilingualData.titleEn = dto.title;
      }
    }
    if (dto.description !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.descriptionZh = dto.description;
      } else {
        bilingualData.descriptionEn = dto.description;
      }
    }
    if (dto.input !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.inputZh = dto.input;
      } else {
        bilingualData.inputEn = dto.input;
      }
    }
    if (dto.output !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.outputZh = dto.output;
      } else {
        bilingualData.outputEn = dto.output;
      }
    }
    if (dto.hint !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.hintZh = dto.hint;
      } else {
        bilingualData.hintEn = dto.hint;
      }
    }
    if (dto.tags !== undefined) {
      if (sourceLanguage === 'zh') {
        bilingualData.tagsZh = dto.tags;
      } else {
        bilingualData.tagsEn = dto.tags;
      }
    }

    // 處理直接提供的雙語欄位
    if (dto.titleZh !== undefined) bilingualData.titleZh = dto.titleZh;
    if (dto.titleEn !== undefined) bilingualData.titleEn = dto.titleEn;
    if (dto.descriptionZh !== undefined) bilingualData.descriptionZh = dto.descriptionZh;
    if (dto.descriptionEn !== undefined) bilingualData.descriptionEn = dto.descriptionEn;
    if (dto.inputZh !== undefined) bilingualData.inputZh = dto.inputZh;
    if (dto.inputEn !== undefined) bilingualData.inputEn = dto.inputEn;
    if (dto.outputZh !== undefined) bilingualData.outputZh = dto.outputZh;
    if (dto.outputEn !== undefined) bilingualData.outputEn = dto.outputEn;
    if (dto.hintZh !== undefined) bilingualData.hintZh = dto.hintZh;
    if (dto.hintEn !== undefined) bilingualData.hintEn = dto.hintEn;
    if (dto.tagsZh !== undefined) bilingualData.tagsZh = dto.tagsZh;
    if (dto.tagsEn !== undefined) bilingualData.tagsEn = dto.tagsEn;

    const updated = await this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.update({
        where: { id },
        data: {
          visibility: nextVisibility,
          difficulty: dto.difficulty ?? existing.difficulty,
          tags: dto.tags !== undefined ? dto.tags : existing.tags,
          allowedLanguages: dto.allowedLanguages ?? existing.allowedLanguages,
          canViewStdout:
            typeof dto.canViewStdout === 'boolean'
              ? dto.canViewStdout
              : existing.canViewStdout,
          title: dto.title ?? existing.title,
          description: dto.description ?? existing.description,
          input: dto.input ?? existing.input,
          output: dto.output ?? existing.output,
          hint: dto.hint !== undefined ? dto.hint : existing.hint,
          sampleInputs,
          sampleOutputs,
          ...bilingualData,
        },
        include: {
          owner: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      await tx.courseProblem.deleteMany({ where: { problemId: id } });

      return problem;
    });

    // 如果勾選自動翻譯，觸發非同步翻譯
    if (dto.autoTranslate) {
      try {
        await this.translatorService.translateProblem(updated.id, currentUserId);
      } catch {
        // 翻譯失敗不影響更新流程（靜默失敗）
      }
    }

    return mapProblemWithOwner(updated, currentUserId);
  }

  private async ensureHomeworkProblemAccess(
    homeworkId: string,
    problemId: string,
    userId: number,
  ) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        courseId: true,
        problems: {
          where: { problemId },
          select: { problemId: true, allowedLanguagesOverride: true },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('HOMEWORK_NOT_FOUND');
    }
    if (homework.problems.length === 0) {
      throw new BadRequestException('PROBLEM_NOT_IN_HOMEWORK');
    }

    const membership = await this.prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId: homework.courseId, userId } },
      select: { roleInCourse: true, leftAt: true },
    });

    if (!membership || membership.leftAt) {
      throw new ForbiddenException('NOT_COURSE_MEMBER');
    }

    if (
      membership.roleInCourse === CourseRole.TEACHER ||
      membership.roleInCourse === CourseRole.TA
    ) {
      return homework.problems[0].allowedLanguagesOverride;
    }

    const now = new Date();
    if (now < homework.startAt) {
      throw new BadRequestException('HOMEWORK_NOT_STARTED');
    }
    if (now > homework.endAt) {
      throw new BadRequestException('HOMEWORK_ENDED');
    }

    return homework.problems[0].allowedLanguagesOverride;
  }

  async deleteProblem(id: string, currentUserId: number) {
    const existing = await this.prisma.problem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Problem not found');

    this.ensureCanModify(existing.ownerId, currentUserId);

    // Use transaction to delete related records first
    await this.prisma.$transaction(async (tx) => {
      // Delete testdata records (MinIO objects will be orphaned but that's ok)
      await tx.problemTestdata.deleteMany({ where: { problemId: id } });

      // Delete AI conversations and their messages (cascade will handle messages)
      await tx.aiConversation.deleteMany({ where: { problemId: id } });

      // Delete submissions (if any)
      await tx.submission.deleteMany({ where: { problemId: id } });

      // Delete course problem associations
      await tx.courseProblem.deleteMany({ where: { problemId: id } });

      // Finally delete the problem
      await tx.problem.delete({ where: { id } });
    });
  }

  async getAllTags(): Promise<string[]> {
    const problems = await this.prisma.problem.findMany({
      where: { visibility: ProblemVisibility.PUBLIC },
      select: { tags: true },
    });

    const allTags = new Set<string>();
    for (const problem of problems) {
      for (const tag of problem.tags) {
        allTags.add(tag);
      }
    }

    return Array.from(allTags).sort((a, b) => a.localeCompare(b, 'zh-TW'));
  }
}
