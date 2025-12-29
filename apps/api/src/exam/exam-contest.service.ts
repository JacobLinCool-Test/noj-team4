import {
  Injectable,
  Inject,
  forwardRef,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../redis/redis.service';
import { AuditAction, ProgrammingLanguage, SubmissionStatus } from '@prisma/client';
import { ExamLoginDto } from './dto';
import { ExamSession, ExamSessionPayload } from './types';
import { isIpAllowed, getClientIp } from './utils';
import { createHash } from 'crypto';

@Injectable()
export class ExamContestService {
  private readonly jwtSecret: string;
  private readonly loginBaseDelayMs = 1000;
  private readonly loginExponentialThreshold = 10;
  private readonly loginRateTtlSeconds = 15 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => QueueService))
    private readonly queue: QueueService,
  ) {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is required but not set');
    }
    this.jwtSecret = secret;
  }

  private getLoginRateLimitKey(code: string, clientIp: string): string {
    const raw = `${code.toUpperCase()}|${clientIp}`;
    const digest = createHash('sha256').update(raw).digest('hex');
    return `exam:login:rate:${digest}`;
  }

  private async enforceLoginRateLimit(code: string, clientIp: string) {
    const key = this.getLoginRateLimitKey(code, clientIp);
    const redis = this.redisService.client;
    const [countValue, lastValue] = await redis.hmget(key, 'count', 'lastAt');
    const count = Number.parseInt(countValue || '0', 10) || 0;
    const lastAt = Number.parseInt(lastValue || '0', 10) || 0;
    const now = Date.now();

    if (lastAt > 0) {
      const nextCount = count + 1;
      const exponent = Math.max(0, nextCount - this.loginExponentialThreshold);
      const requiredDelayMs = this.loginBaseDelayMs * 2 ** exponent;
      const elapsed = now - lastAt;
      if (elapsed < requiredDelayMs) {
        const retryAfterSeconds = Math.ceil(
          (requiredDelayMs - elapsed) / 1000,
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Exam login rate limited',
            retryAfter: retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await redis
      .multi()
      .hset(key, { count: count + 1, lastAt: now })
      .expire(key, this.loginRateTtlSeconds)
      .exec();
  }

  private async clearLoginRateLimit(code: string, clientIp: string) {
    const key = this.getLoginRateLimitKey(code, clientIp);
    await this.redisService.client.del(key);
  }

  /**
   * 考試登入
   */
  async login(
    dto: ExamLoginDto,
    clientIp: string,
    userAgent?: string,
  ): Promise<{ session: ExamSession; token: string }> {
    const code = dto.code.toUpperCase();

    await this.enforceLoginRateLimit(code, clientIp);

    // 查找代碼
    const examCode = await this.prisma.examCode.findUnique({
      where: { code },
      include: {
        exam: true,
        student: {
          select: { id: true, username: true, nickname: true },
        },
      },
    });

    if (!examCode) {
      throw new UnauthorizedException('Invalid exam code');
    }

    const { exam, student } = examCode;

    // 驗證學生存在
    if (!student) {
      throw new UnauthorizedException('Invalid exam code - no student associated');
    }

    // 驗證考試時間（只檢查是否已結束，允許提前登入看倒數）
    const now = new Date();
    if (now > exam.endsAt) {
      throw new ForbiddenException('Exam has ended');
    }

    // 驗證 IP
    if (!isIpAllowed(clientIp, exam.ipAllowList)) {
      throw new ForbiddenException('IP not allowed');
    }

    // 生成 JWT session token
    const payload: ExamSessionPayload = {
      sub: student.id,
      examId: exam.id,
      code: examCode.code,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(exam.endsAt.getTime() / 1000),
    };

    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
    });

    // 更新代碼使用狀態
    await this.prisma.examCode.update({
      where: { code },
      data: {
        usedAt: examCode.usedAt || now,
        usedIp: examCode.usedIp || clientIp,
        sessionToken: token,
      },
    });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.EXAM_LOGIN,
        userId: student.id,
        courseId: exam.courseId,
        ip: clientIp,
        userAgent,
        detail: { examId: exam.id, code: examCode.code },
      },
    });

    const session: ExamSession = {
      userId: student.id,
      user: student,
      exam,
      code: examCode,
    };

    await this.clearLoginRateLimit(code, clientIp);

    return { session, token };
  }

  /**
   * 驗證 Session Token
   */
  async validateSession(token: string): Promise<ExamSession | null> {
    try {
      const payload = this.jwtService.verify<ExamSessionPayload>(token, {
        secret: this.jwtSecret,
      });

      // 查找代碼和考試
      const examCode = await this.prisma.examCode.findFirst({
        where: {
          code: payload.code,
          examId: payload.examId,
          studentId: payload.sub,
          sessionToken: token,
        },
        include: {
          exam: true,
          student: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      if (!examCode || !examCode.student || examCode.studentId === null) {
        return null;
      }

      return {
        userId: examCode.studentId,
        user: examCode.student,
        exam: examCode.exam,
        code: examCode,
      };
    } catch {
      return null;
    }
  }

  /**
   * 取得考試題目列表
   */
  async getProblems(session: ExamSession) {
    const { exam } = session;

    // 取得提交狀態
    const submissions = await this.prisma.submission.findMany({
      where: {
        examId: exam.id,
        userId: session.userId,
      },
      select: {
        problemId: true,
        status: true,
        score: true,
      },
    });

    // 按題目分組，取最高分
    const problemStatus = new Map<
      string,
      { bestScore: number; solved: boolean; attempts: number }
    >();

    for (const sub of submissions) {
      const current = problemStatus.get(sub.problemId) || {
        bestScore: 0,
        solved: false,
        attempts: 0,
      };
      current.attempts++;
      if (sub.score !== null && sub.score > current.bestScore) {
        current.bestScore = sub.score;
      }
      if (sub.status === 'AC') {
        current.solved = true;
      }
      problemStatus.set(sub.problemId, current);
    }

    // 取得題目資訊
    const problems = await this.prisma.problem.findMany({
      where: { id: { in: exam.problemIds } },
      select: {
        id: true,
        displayId: true,
        title: true,
        difficulty: true,
        allowedLanguages: true,
      },
    });

    // 按照 exam.problemIds 的順序排列
    const problemMap = new Map(problems.map((p) => [p.id, p]));
    const orderedProblems = exam.problemIds
      .map((id) => problemMap.get(id))
      .filter(Boolean);

    return orderedProblems.map((p) => {
      const status = problemStatus.get(p!.id);
      return {
        ...p,
        status: status
          ? {
              bestScore: status.bestScore,
              solved: status.solved,
              attempts: status.attempts,
            }
          : null,
      };
    });
  }

  /**
   * 取得單一題目詳情
   */
  async getProblem(session: ExamSession, problemId: string) {
    const { exam } = session;

    // 驗證題目屬於這場考試
    if (!exam.problemIds.includes(problemId)) {
      throw new NotFoundException('Problem not found in this exam');
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        displayId: true,
        title: true,
        description: true,
        input: true,
        output: true,
        hint: true,
        sampleInputs: true,
        sampleOutputs: true,
        difficulty: true,
        allowedLanguages: true,
        submissionType: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    return problem;
  }

  /**
   * 取得考試提交列表
   */
  async getSubmissions(session: ExamSession) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        examId: session.exam.id,
        userId: session.userId,
      },
      include: {
        problem: {
          select: { id: true, displayId: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  }

  /**
   * 取得單一提交詳情
   */
  async getSubmission(session: ExamSession, submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        examId: session.exam.id,
        userId: session.userId,
      },
      include: {
        problem: {
          select: { id: true, displayId: true, title: true },
        },
        cases: {
          orderBy: { caseNo: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  /**
   * 取得排行榜
   */
  async getScoreboard(session: ExamSession) {
    const { exam } = session;

    if (!exam.scoreboardVisible) {
      throw new ForbiddenException('Scoreboard is not visible');
    }

    // 取得所有提交
    const submissions = await this.prisma.submission.findMany({
      where: { examId: exam.id },
      select: {
        userId: true,
        problemId: true,
        score: true,
        status: true,
      },
    });

    // 計算每位學生的成績
    const studentScores = new Map<
      number,
      Map<string, { score: number; solved: boolean }>
    >();

    for (const sub of submissions) {
      // Skip submissions without a userId
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
          solved: sub.status === 'AC',
        });
      }
    }

    // 取得學生資訊（只顯示暱稱或匿名）
    const userIds = Array.from(studentScores.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 組裝排行榜
    const scoreboard = Array.from(studentScores.entries()).map(
      ([userId, problemScores]) => {
        const user = userMap.get(userId);
        let totalScore = 0;
        let solvedCount = 0;

        for (const [, data] of problemScores) {
          totalScore += data.score;
          if (data.solved) solvedCount++;
        }

        return {
          // 匿名化：只顯示暱稱的第一個字，或用編號
          displayName: user?.nickname
            ? user.nickname.charAt(0) + '***'
            : `User ${userId}`,
          totalScore,
          solvedCount,
          isMe: userId === session.userId,
        };
      },
    );

    // 排序
    scoreboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.solvedCount - a.solvedCount;
    });

    // 加上排名
    return scoreboard.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }

  /**
   * 取得考試剩餘時間
   */
  getTimeRemaining(session: ExamSession) {
    const now = new Date();
    const remaining = Math.max(
      0,
      session.exam.endsAt.getTime() - now.getTime(),
    );
    const started = now >= session.exam.startsAt;
    const ended = now > session.exam.endsAt;

    return {
      remaining,
      remainingMs: remaining,
      remainingSeconds: Math.floor(remaining / 1000),
      startsAt: session.exam.startsAt.toISOString(),
      endsAt: session.exam.endsAt.toISOString(),
      started,
      ended,
    };
  }

  /**
   * 取得考試資訊
   */
  getExamInfo(session: ExamSession) {
    return {
      examId: session.exam.id,
      title: session.exam.title,
      description: session.exam.description,
      startsAt: session.exam.startsAt.toISOString(),
      endsAt: session.exam.endsAt.toISOString(),
      problemCount: session.exam.problemIds.length,
      scoreboardVisible: session.exam.scoreboardVisible,
    };
  }

  /**
   * 提交程式碼（單一檔案或函式模式）
   */
  async submitCode(
    session: ExamSession,
    problemId: string,
    code: string,
    language: ProgrammingLanguage,
    clientIp?: string,
    userAgent?: string,
  ) {
    const { exam } = session;

    // 驗證考試時間
    const now = new Date();
    if (now < exam.startsAt) {
      throw new ForbiddenException('Exam has not started yet');
    }
    if (now > exam.endsAt) {
      throw new ForbiddenException('Exam has ended');
    }

    // 驗證題目屬於這場考試
    if (!exam.problemIds.includes(problemId)) {
      throw new NotFoundException('Problem not found in this exam');
    }

    // 取得題目資訊
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        displayId: true,
        allowedLanguages: true,
        submissionType: true,
        templateKey: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    // 驗證語言
    if (!problem.allowedLanguages.includes(language)) {
      throw new BadRequestException(`Language ${language} is not allowed for this problem`);
    }

    // 驗證提交類型
    if (problem.submissionType === 'MULTI_FILE') {
      throw new BadRequestException('This problem requires ZIP file submission');
    }

    // 處理函式模式：合併 template
    let finalCode = code;
    if (problem.submissionType === 'FUNCTION_ONLY' && problem.templateKey) {
      const templateCode = await this.minio.getObjectAsString('noj-templates', problem.templateKey);
      finalCode = templateCode.replace('// STUDENT_CODE_HERE', code);
    }

    // 建立資料庫記錄 (ID 由 Prisma 自動生成)
    const submission = await this.prisma.submission.create({
      data: {
        problemId: problem.id,
        userId: session.userId,
        language,
        sourceKey: '', // 稍後更新
        status: SubmissionStatus.PENDING,
        examId: exam.id,
        ip: clientIp,
        userAgent,
      },
      select: {
        id: true,
        problemId: true,
        language: true,
        status: true,
        score: true,
        createdAt: true,
        problem: {
          select: { id: true, displayId: true, title: true },
        },
      },
    });

    // 上傳原始碼
    const sourceKey = `submissions/${submission.id}/source.${this.getExtension(language)}`;
    await this.minio.putObject('noj-submissions', sourceKey, Buffer.from(finalCode));

    // 更新 sourceKey
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { sourceKey },
    });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SUBMISSION_CREATE,
        userId: session.userId,
        courseId: exam.courseId,
        ip: clientIp,
        userAgent,
        detail: {
          submissionId: submission.id,
          examId: exam.id,
          problemId: problem.id,
        },
      },
    });

    // 加入評測隊列
    await this.queue.enqueueJudgeSubmission(submission.id);

    return submission;
  }

  /**
   * 提交 ZIP 檔案（多檔案模式）
   */
  async submitZip(
    session: ExamSession,
    problemId: string,
    file: Express.Multer.File,
    language: ProgrammingLanguage,
    clientIp?: string,
    userAgent?: string,
  ) {
    const { exam } = session;

    // 驗證考試時間
    const now = new Date();
    if (now < exam.startsAt) {
      throw new ForbiddenException('Exam has not started yet');
    }
    if (now > exam.endsAt) {
      throw new ForbiddenException('Exam has ended');
    }

    // 驗證題目屬於這場考試
    if (!exam.problemIds.includes(problemId)) {
      throw new NotFoundException('Problem not found in this exam');
    }

    // 取得題目資訊
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        displayId: true,
        allowedLanguages: true,
        submissionType: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    // 驗證語言
    if (!problem.allowedLanguages.includes(language)) {
      throw new BadRequestException(`Language ${language} is not allowed for this problem`);
    }

    // 驗證提交類型
    if (problem.submissionType !== 'MULTI_FILE') {
      throw new BadRequestException('This problem does not accept ZIP file submission');
    }

    // 建立資料庫記錄 (ID 由 Prisma 自動生成)
    const submission = await this.prisma.submission.create({
      data: {
        problemId: problem.id,
        userId: session.userId,
        language,
        sourceKey: '', // 稍後更新
        status: SubmissionStatus.PENDING,
        examId: exam.id,
        ip: clientIp,
        userAgent,
      },
      select: {
        id: true,
        problemId: true,
        language: true,
        status: true,
        score: true,
        createdAt: true,
        problem: {
          select: { id: true, displayId: true, title: true },
        },
      },
    });

    // 上傳 ZIP 檔案
    const sourceKey = `submissions/${submission.id}/source.zip`;
    await this.minio.putObject('noj-submissions', sourceKey, file.buffer);

    // 更新 sourceKey
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { sourceKey },
    });

    // 記錄審計日誌
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SUBMISSION_CREATE,
        userId: session.userId,
        courseId: exam.courseId,
        ip: clientIp,
        userAgent,
        detail: {
          submissionId: submission.id,
          examId: exam.id,
          problemId: problem.id,
        },
      },
    });

    // 加入評測隊列
    await this.queue.enqueueJudgeSubmission(submission.id);

    return submission;
  }

  private getExtension(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.C:
        return 'c';
      case ProgrammingLanguage.CPP:
        return 'cpp';
      case ProgrammingLanguage.JAVA:
        return 'java';
      case ProgrammingLanguage.PYTHON:
        return 'py';
      default:
        return 'txt';
    }
  }
}
