import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourseRole, AuditAction } from '@prisma/client';
import { CreateExamDto, UpdateExamDto, GenerateCodesDto } from './dto';
import { generateExamId, generateExamCode, isValidCidr } from './utils';
import type { JwtPayload } from '../auth/types/jwt-payload';

type ExamStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

function getExamStatus(startsAt: Date, endsAt: Date): ExamStatus {
  const now = new Date();
  if (now < startsAt) return 'UPCOMING';
  if (now > endsAt) return 'ENDED';
  return 'ONGOING';
}

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 建立考試
   */
  async createExam(
    courseSlug: string,
    dto: CreateExamDto,
    viewer: JwtPayload,
  ) {
    // 取得課程並驗證權限
    const { course, memberRole } = await this.getCourseWithPermission(
      courseSlug,
      viewer,
    );

    // 驗證時間
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt >= endsAt) {
      throw new BadRequestException('End time must be after start time');
    }

    // 驗證 IP 白名單格式
    if (dto.ipAllowList) {
      for (const cidr of dto.ipAllowList) {
        if (!isValidCidr(cidr)) {
          throw new BadRequestException(`Invalid CIDR format: ${cidr}`);
        }
      }
    }

    // 驗證題目存在
    if (dto.problemIds.length > 0) {
      const problems = await this.prisma.problem.findMany({
        where: { id: { in: dto.problemIds } },
        select: { id: true },
      });
      const foundIds = new Set(problems.map((p) => p.id));
      const missingIds = dto.problemIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(
          `Problems not found: ${missingIds.join(', ')}`,
        );
      }
    }

    // 生成唯一 ID
    let examId: string;
    let attempts = 0;
    do {
      examId = generateExamId();
      const existing = await this.prisma.exam.findUnique({
        where: { id: examId },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Failed to generate unique exam ID');
    }

    // 建立考試
    const exam = await this.prisma.exam.create({
      data: {
        id: examId,
        courseId: course.id,
        title: dto.title,
        description: dto.description,
        problemIds: dto.problemIds,
        startsAt,
        endsAt,
        ipAllowList: dto.ipAllowList || [],
        scoreboardVisible: dto.scoreboardVisible ?? false,
        createdById: viewer.sub,
      },
    });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.EXAM_CREATE,
        userId: viewer.sub,
        courseId: course.id,
        detail: { examId: exam.id, title: exam.title },
      },
    });

    // 自動為所有課程學生生成登入代碼
    const students = await this.prisma.courseMember.findMany({
      where: {
        courseId: course.id,
        roleInCourse: CourseRole.STUDENT,
        leftAt: null,
      },
      select: { userId: true },
    });

    if (students.length > 0) {
      await this.generateCodesInternal(exam.id, students.map((s) => s.userId));
    }

    return {
      ...exam,
      status: getExamStatus(exam.startsAt, exam.endsAt),
    };
  }

  /**
   * 取得考試列表
   */
  async listExams(courseSlug: string, viewer: JwtPayload) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exams = await this.prisma.exam.findMany({
      where: { courseId: course.id },
      orderBy: { startsAt: 'desc' },
      include: {
        _count: {
          select: { codes: true, submissions: true },
        },
        createdBy: {
          select: { id: true, username: true, nickname: true },
        },
      },
    });

    return exams.map((exam) => ({
      ...exam,
      status: getExamStatus(exam.startsAt, exam.endsAt),
      codeCount: exam._count.codes,
      submissionCount: exam._count.submissions,
      _count: undefined,
    }));
  }

  /**
   * 取得考試詳情
   */
  async getExam(courseSlug: string, examId: string, viewer: JwtPayload) {
    const { course, memberRole } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
      include: {
        _count: {
          select: { codes: true, submissions: true },
        },
        createdBy: {
          select: { id: true, username: true, nickname: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Staff (Teacher/TA) can edit and delete
    const isStaff = memberRole === CourseRole.TEACHER || memberRole === CourseRole.TA;

    return {
      ...exam,
      status: getExamStatus(exam.startsAt, exam.endsAt),
      codeCount: exam._count.codes,
      submissionCount: exam._count.submissions,
      canEdit: isStaff,
      canDelete: isStaff,
      _count: undefined,
    };
  }

  /**
   * 更新考試
   */
  async updateExam(
    courseSlug: string,
    examId: string,
    dto: UpdateExamDto,
    viewer: JwtPayload,
  ) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 驗證時間
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : exam.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : exam.endsAt;
    if (startsAt >= endsAt) {
      throw new BadRequestException('End time must be after start time');
    }

    // 驗證 IP 白名單格式
    if (dto.ipAllowList) {
      for (const cidr of dto.ipAllowList) {
        if (!isValidCidr(cidr)) {
          throw new BadRequestException(`Invalid CIDR format: ${cidr}`);
        }
      }
    }

    // 驗證題目存在
    if (dto.problemIds && dto.problemIds.length > 0) {
      const problems = await this.prisma.problem.findMany({
        where: { id: { in: dto.problemIds } },
        select: { id: true },
      });
      const foundIds = new Set(problems.map((p) => p.id));
      const missingIds = dto.problemIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(
          `Problems not found: ${missingIds.join(', ')}`,
        );
      }
    }

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        title: dto.title,
        description: dto.description,
        problemIds: dto.problemIds,
        startsAt,
        endsAt,
        ipAllowList: dto.ipAllowList,
        scoreboardVisible: dto.scoreboardVisible,
      },
    });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.EXAM_UPDATE,
        userId: viewer.sub,
        courseId: course.id,
        detail: { examId: exam.id },
      },
    });

    return {
      ...updated,
      status: getExamStatus(updated.startsAt, updated.endsAt),
    };
  }

  /**
   * 刪除考試
   */
  async deleteExam(courseSlug: string, examId: string, viewer: JwtPayload) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    await this.prisma.exam.delete({ where: { id: examId } });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.EXAM_DELETE,
        userId: viewer.sub,
        courseId: course.id,
        detail: { examId: exam.id, title: exam.title },
      },
    });

    return { success: true };
  }

  /**
   * 生成登入代碼
   */
  async generateCodes(
    courseSlug: string,
    examId: string,
    dto: GenerateCodesDto,
    viewer: JwtPayload,
  ) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 驗證學生是課程成員
    const members = await this.prisma.courseMember.findMany({
      where: {
        courseId: course.id,
        userId: { in: dto.studentIds },
        roleInCourse: CourseRole.STUDENT,
      },
      select: { userId: true },
    });

    const memberUserIds = new Set(members.map((m) => m.userId));
    const invalidIds = dto.studentIds.filter((id) => !memberUserIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Users are not students in this course: ${invalidIds.join(', ')}`,
      );
    }

    // 檢查是否已有代碼
    const existingCodes = await this.prisma.examCode.findMany({
      where: {
        examId,
        studentId: { in: dto.studentIds },
      },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingCodes.map((c) => c.studentId));
    const newStudentIds = dto.studentIds.filter(
      (id) => !existingStudentIds.has(id),
    );

    if (newStudentIds.length === 0) {
      throw new ConflictException('All students already have codes');
    }

    // 生成代碼
    const codes: { code: string; studentId: number }[] = [];
    const usedCodes = new Set<string>();

    for (const studentId of newStudentIds) {
      let code: string;
      let attempts = 0;
      do {
        code = generateExamCode();
        if (usedCodes.has(code)) continue;
        const existing = await this.prisma.examCode.findUnique({
          where: { code },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 100);

      if (attempts >= 100) {
        throw new Error('Failed to generate unique code');
      }

      usedCodes.add(code);
      codes.push({ code, studentId });
    }

    // 批量建立
    await this.prisma.examCode.createMany({
      data: codes.map(({ code, studentId }) => ({
        code,
        examId,
        studentId,
      })),
    });

    // 取得完整資料
    const createdCodes = await this.prisma.examCode.findMany({
      where: { code: { in: codes.map((c) => c.code) } },
      include: {
        student: {
          select: { id: true, username: true, nickname: true },
        },
      },
    });

    return createdCodes;
  }

  /**
   * 取得代碼列表
   */
  async listCodes(courseSlug: string, examId: string, viewer: JwtPayload) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const codes = await this.prisma.examCode.findMany({
      where: { examId },
      include: {
        student: {
          select: { id: true, username: true, nickname: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return codes.map((code) => ({
      code: code.code,
      examId: code.examId,
      studentId: code.studentId,
      studentUsername: code.student?.username ?? 'Unknown',
      studentNickname: code.student?.nickname ?? null,
      studentEmail: code.student?.email ?? null,
      usedAt: code.usedAt,
      usedIp: code.usedIp,
      createdAt: code.createdAt,
    }));
  }

  /**
   * 刪除代碼
   */
  async deleteCode(
    courseSlug: string,
    examId: string,
    code: string,
    viewer: JwtPayload,
  ) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const examCode = await this.prisma.examCode.findFirst({
      where: { code, examId },
      include: { exam: true },
    });

    if (!examCode || examCode.exam.courseId !== course.id) {
      throw new NotFoundException('Code not found');
    }

    await this.prisma.examCode.delete({ where: { code } });

    return { success: true };
  }

  /**
   * 匯出代碼（CSV 格式）
   */
  async exportCodes(courseSlug: string, examId: string, viewer: JwtPayload) {
    const codes = await this.listCodes(courseSlug, examId, viewer);

    const header = 'Code,Username,Nickname,Used At,Used IP\n';
    const rows = codes
      .map((c) => {
        const nickname = c.studentNickname || '';
        const usedAt = c.usedAt ? new Date(c.usedAt).toISOString() : '';
        const usedIp = c.usedIp || '';
        return `${c.code},${c.studentUsername},"${nickname}",${usedAt},${usedIp}`;
      })
      .join('\n');

    return header + rows;
  }

  /**
   * 取得考試提交紀錄
   */
  async listSubmissions(
    courseSlug: string,
    examId: string,
    viewer: JwtPayload,
  ) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const submissions = await this.prisma.submission.findMany({
      where: { examId },
      include: {
        user: {
          select: { id: true, username: true, nickname: true },
        },
        problem: {
          select: { id: true, displayId: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  }

  /**
   * 取得成績排行榜
   */
  async getScoreboard(courseSlug: string, examId: string, viewer: JwtPayload) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, courseId: course.id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 取得所有提交，按學生和題目分組，取最高分
    const submissions = await this.prisma.submission.findMany({
      where: { examId },
      select: {
        userId: true,
        problemId: true,
        score: true,
        status: true,
        createdAt: true,
      },
    });

    // 計算每位學生的成績
    const studentScores = new Map<
      number,
      Map<string, { score: number; solvedAt: Date | null }>
    >();

    for (const sub of submissions) {
      if (sub.userId === null) continue;
      if (!studentScores.has(sub.userId)) {
        studentScores.set(sub.userId, new Map());
      }
      const problemScores = studentScores.get(sub.userId)!;

      const current = problemScores.get(sub.problemId);
      const score = sub.score || 0;

      if (!current || score > current.score) {
        problemScores.set(sub.problemId, {
          score,
          solvedAt: sub.status === 'AC' ? sub.createdAt : null,
        });
      }
    }

    // 取得學生資訊
    const userIds = Array.from(studentScores.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, nickname: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 組裝排行榜
    const scoreboard = Array.from(studentScores.entries()).map(
      ([userId, problemScores]) => {
        const user = userMap.get(userId)!;
        const problems: Record<
          string,
          { score: number; solved: boolean }
        > = {};
        let totalScore = 0;
        let solvedCount = 0;

        for (const [problemId, data] of problemScores) {
          problems[problemId] = {
            score: data.score,
            solved: data.solvedAt !== null,
          };
          totalScore += data.score;
          if (data.solvedAt) solvedCount++;
        }

        return {
          userId,
          username: user.username,
          nickname: user.nickname,
          totalScore,
          solvedCount,
          problems,
        };
      },
    );

    // 排序：總分 > 解題數
    scoreboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.solvedCount - a.solvedCount;
    });

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        problemIds: exam.problemIds,
      },
      scoreboard,
    };
  }

  /**
   * 重新生成代碼
   */
  async regenerateCode(
    courseSlug: string,
    examId: string,
    code: string,
    viewer: JwtPayload,
  ) {
    const { course } = await this.getCourseWithPermission(courseSlug, viewer);

    const examCode = await this.prisma.examCode.findFirst({
      where: { code, examId },
      include: { exam: true },
    });

    if (!examCode || examCode.exam.courseId !== course.id) {
      throw new NotFoundException('Code not found');
    }

    // 生成新代碼
    let newCode: string;
    let attempts = 0;
    do {
      newCode = generateExamCode();
      const existing = await this.prisma.examCode.findUnique({
        where: { code: newCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 100);

    if (attempts >= 100) {
      throw new Error('Failed to generate unique code');
    }

    // 更新代碼
    const updated = await this.prisma.examCode.update({
      where: { code },
      data: { code: newCode, usedAt: null, usedIp: null },
      include: {
        student: {
          select: { id: true, username: true, nickname: true, email: true },
        },
      },
    });

    return {
      code: updated.code,
      examId: updated.examId,
      studentId: updated.studentId,
      studentUsername: updated.student?.username ?? 'Unknown',
      studentNickname: updated.student?.nickname ?? null,
      studentEmail: updated.student?.email ?? null,
      usedAt: updated.usedAt,
      usedIp: updated.usedIp,
      createdAt: updated.createdAt,
    };
  }

  /**
   * 為新成員生成該課程所有未結束考試的代碼
   * 此方法供 CourseService 呼叫
   */
  async generateCodesForNewMember(courseId: number, userId: number) {
    // 取得該課程所有未結束的考試
    const now = new Date();
    const exams = await this.prisma.exam.findMany({
      where: {
        courseId,
        endsAt: { gt: now },
      },
      select: { id: true },
    });

    if (exams.length === 0) {
      return;
    }

    // 為每個考試生成代碼
    for (const exam of exams) {
      await this.generateCodesInternal(exam.id, [userId]);
    }
  }

  /**
   * 內部方法：為指定學生生成考試代碼
   */
  private async generateCodesInternal(examId: string, studentIds: number[]) {
    if (studentIds.length === 0) return;

    // 檢查是否已有代碼
    const existingCodes = await this.prisma.examCode.findMany({
      where: {
        examId,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingCodes.map((c) => c.studentId));
    const newStudentIds = studentIds.filter(
      (id) => !existingStudentIds.has(id),
    );

    if (newStudentIds.length === 0) {
      return;
    }

    // 生成代碼
    const codes: { code: string; studentId: number }[] = [];
    const usedCodes = new Set<string>();

    for (const studentId of newStudentIds) {
      let code: string;
      let attempts = 0;
      do {
        code = generateExamCode();
        if (usedCodes.has(code)) continue;
        const existing = await this.prisma.examCode.findUnique({
          where: { code },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 100);

      if (attempts >= 100) {
        throw new Error('Failed to generate unique code');
      }

      usedCodes.add(code);
      codes.push({ code, studentId });
    }

    // 批量建立
    await this.prisma.examCode.createMany({
      data: codes.map(({ code, studentId }) => ({
        code,
        examId,
        studentId,
      })),
    });
  }

  /**
   * 取得課程並驗證權限（需要 Teacher 或 TA）
   */
  private async getCourseWithPermission(courseSlug: string, viewer: JwtPayload) {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const member = await this.prisma.courseMember.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: viewer.sub,
        },
      },
    });

    const isAdmin = viewer.role === 'ADMIN';
    const isStaff =
      member?.roleInCourse === CourseRole.TEACHER ||
      member?.roleInCourse === CourseRole.TA;

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException(
        'Only teachers and TAs can manage exams',
      );
    }

    return { course, memberRole: member?.roleInCourse };
  }
}
