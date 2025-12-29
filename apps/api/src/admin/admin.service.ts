import { Injectable, BadRequestException } from '@nestjs/common';
import {
  AiProvider,
  AiFeature,
  ReasoningEffort,
  AuditAction,
  AuditResult,
  Prisma,
  CourseRole,
  EmailSendType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { buildCsv } from '../common/csv';
import { UpdateAllAiConfigsDto } from './dto/ai-feature-config.dto';
import { MailService } from '../mail/mail.service';
import {
  BulkCreateUsersDto,
  BulkCreateUsersResultDto,
  PasswordMode,
} from './dto/bulk-create-users.dto';

// 功能預設值（用於初始化）
const FEATURE_DEFAULTS: Record<
  AiFeature,
  {
    provider: AiProvider;
    model: string;
    reasoningEffort: ReasoningEffort;
    maxOutputTokens: number;
    temperature: number;
    enabled: boolean;
  }
> = {
  ASSISTANT: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 2048,
    temperature: 0.4,
    enabled: true,
  },
  PROBLEM_CREATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 8192,
    temperature: 0.7,
    enabled: true,
  },
  TESTDATA_GENERATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 4096,
    temperature: 0.5,
    enabled: true,
  },
  TRANSLATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 8192,
    temperature: 0.2,
    enabled: true,
  },
  CODE_SAFETY_CHECK: {
    provider: AiProvider.OPENAI,
    model: 'gpt-5-nano',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 256,
    temperature: 0,
    enabled: true,
  },
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
  }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 10, 1, 50);
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: Prisma.UserWhereInput = {};

    if (params.search) {
      const searchTerm = params.search.trim();
      where.OR = [
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { nickname: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAiFeatureConfigs() {
    // 確保全域設定存在
    const global = await this.prisma.aiGlobalConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, forceDisabled: false },
    });

    // 確保所有功能都有配置
    const features = Object.values(AiFeature) as AiFeature[];
    const configs = await Promise.all(
      features.map((feature) =>
        this.prisma.aiFeatureConfig.upsert({
          where: { feature },
          update: {},
          create: { feature, ...FEATURE_DEFAULTS[feature] },
        }),
      ),
    );

    return { forceDisabled: global.forceDisabled, configs };
  }

  async updateAiFeatureConfigs(dto: UpdateAllAiConfigsDto) {
    // 更新全域開關
    await this.prisma.aiGlobalConfig.upsert({
      where: { id: 1 },
      update: { forceDisabled: dto.forceDisabled },
      create: { id: 1, forceDisabled: dto.forceDisabled },
    });

    // 更新各功能配置
    await Promise.all(
      dto.configs.map((config) =>
        this.prisma.aiFeatureConfig.upsert({
          where: { feature: config.feature },
          update: {
            provider: config.provider,
            model: config.model,
            reasoningEffort: config.reasoningEffort ?? ReasoningEffort.NONE,
            maxOutputTokens: config.maxOutputTokens ?? 2048,
            temperature: config.temperature ?? 0.4,
            enabled: config.enabled ?? true,
          },
          create: {
            feature: config.feature,
            provider: config.provider,
            model: config.model,
            reasoningEffort: config.reasoningEffort ?? ReasoningEffort.NONE,
            maxOutputTokens: config.maxOutputTokens ?? 2048,
            temperature: config.temperature ?? 0.4,
            enabled: config.enabled ?? true,
          },
        }),
      ),
    );

    return this.getAiFeatureConfigs();
  }

  async listEmailSendLogs(params: { page?: number; limit?: number }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 10, 1, 50);
    const skip = (page - 1) * limit;

    const where = {};

    const [logs, total] = await Promise.all([
      this.prisma.emailSendLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        where,
        select: {
          id: true,
          type: true,
          status: true,
          recipientEmail: true,
          subject: true,
          provider: true,
          messageId: true,
          error: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: { id: true, username: true },
          },
        },
      }),
      this.prisma.emailSendLog.count({ where }),
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

  async listAuditLogs(params: {
    actions: AuditAction[];
    page?: number;
    limit?: number;
  }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 10, 1, 50);
    const skip = (page - 1) * limit;

    const where = { action: { in: params.actions } } as const;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        where,
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

  async listLoginAudits(params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      action: AuditAction.LOGIN,
    };
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.result) {
      where.result = params.result;
    }
    const createdAt = this.buildCreatedAtFilter(params.startAt, params.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        where,
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

  async listSubmissionAudits(params: {
    startAt?: string;
    endAt?: string;
    courseId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    userId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {};

    if (params.courseId) {
      where.courseId = params.courseId;
    }
    if (params.homeworkId) {
      where.homeworkId = params.homeworkId;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.status) {
      where.status = params.status as any;
    }
    if (params.problemId) {
      const byDisplayId = await this.prisma.problem.findUnique({
        where: { displayId: params.problemId },
        select: { id: true },
      });
      if (byDisplayId) {
        where.problemId = byDisplayId.id;
      } else {
        const byId = await this.prisma.problem.findUnique({
          where: { id: params.problemId },
          select: { id: true },
        });
        if (byId) {
          where.problemId = byId.id;
        } else {
          return this.emptyPagedResult('submissions');
        }
      }
    }
    const createdAt = this.buildCreatedAtFilter(params.startAt, params.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        where,
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
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              term: true,
            },
          },
          homework: {
            select: {
              id: true,
              title: true,
            },
          },
          problem: {
            select: {
              displayId: true,
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

  async exportLoginAuditsCsv(params: {
    startAt?: string;
    endAt?: string;
    result?: AuditResult;
    userId?: number;
    limit?: number;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      action: AuditAction.LOGIN,
    };
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.result) {
      where.result = params.result;
    }
    const createdAt = this.buildCreatedAtFilter(params.startAt, params.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const limit = clampInt(params.limit ?? 5000, 1, 20000);

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

  async exportSubmissionAuditsCsv(params: {
    startAt?: string;
    endAt?: string;
    courseId?: number;
    homeworkId?: string;
    problemId?: string;
    status?: string;
    userId?: number;
    limit?: number;
  }) {
    const where: Prisma.SubmissionWhereInput = {};

    if (params.courseId) {
      where.courseId = params.courseId;
    }
    if (params.homeworkId) {
      where.homeworkId = params.homeworkId;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.status) {
      where.status = params.status as any;
    }
    if (params.problemId) {
      const byDisplayId = await this.prisma.problem.findUnique({
        where: { displayId: params.problemId },
        select: { id: true },
      });
      if (byDisplayId) {
        where.problemId = byDisplayId.id;
      } else {
        const byId = await this.prisma.problem.findUnique({
          where: { id: params.problemId },
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
    const createdAt = this.buildCreatedAtFilter(params.startAt, params.endAt);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const limit = clampInt(params.limit ?? 5000, 1, 20000);

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

  // =========================================================================
  // Pending Verification Users
  // =========================================================================

  async listPendingVerificationUsers(params: { page?: number; limit?: number }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 10, 1, 50);
    const skip = (page - 1) * limit;

    const where = { emailVerifiedAt: null };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async forceVerifyUser(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  // =========================================================================
  // User Management
  // =========================================================================

  async updateUserStatus(
    userId: number,
    status: UserStatus,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, status: true },
    });

    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async updateUserRole(userId: number, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    // Delete the user (cascade and setNull will handle related data)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { id: userId, username: user.username, email: user.email };
  }

  async forceLogoutUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    // Revoke all refresh tokens for this user
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      id: userId,
      username: user.username,
      revokedTokens: result.count,
    };
  }

  // =========================================================================
  // Admin Action Logs
  // =========================================================================

  async logAdminAction(params: {
    adminId: number;
    action: string;
    targetType?: string;
    targetId?: number;
    details?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  }

  async listAdminActionLogs(params: { page?: number; limit?: number }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 10, 1, 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          details: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          admin: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.adminActionLog.count(),
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

  // =========================================================================
  // Bulk Create Users
  // =========================================================================

  async bulkCreateUsers(
    dto: BulkCreateUsersDto,
    adminId: number,
    meta: { ip?: string; userAgent?: string; locale?: 'zh-TW' | 'en' },
  ): Promise<BulkCreateUsersResultDto> {
    // Validate password is provided when mode is SPECIFIED
    if (dto.passwordMode === PasswordMode.SPECIFIED && !dto.password) {
      throw new BadRequestException('Password is required when passwordMode is "specified"');
    }

    // Validate course exists if courseId is provided
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: { id: true, status: true },
      });
      if (!course) {
        throw new BadRequestException('Course not found');
      }
      if (course.status === 'ARCHIVED') {
        throw new BadRequestException('Cannot add users to archived course');
      }
    }

    const result: BulkCreateUsersResultDto = {
      created: [],
      skipped: [],
      errors: [],
    };

    // Deduplicate emails
    const uniqueEmails = [...new Set(dto.emails.map((e) => e.trim().toLowerCase()))];

    for (const email of uniqueEmails) {
      try {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true, username: true },
        });

        if (existingUser) {
          result.skipped.push({
            email,
            reason: 'EMAIL_EXISTS',
          });
          continue;
        }

        // Generate username from email
        const username = await this.generateUniqueUsername(email);

        // Generate or use specified password
        const plainPassword =
          dto.passwordMode === PasswordMode.RANDOM
            ? this.generateRandomPassword()
            : dto.password!;

        const passwordHash = await argon2.hash(plainPassword);

        // Create user
        const user = await this.prisma.user.create({
          data: {
            email,
            username,
            passwordHash,
            emailVerifiedAt: dto.autoVerify ? new Date() : null,
          },
          select: { id: true, username: true, email: true },
        });

        // Add user to course if specified
        if (dto.courseId) {
          await this.prisma.courseMember.create({
            data: {
              courseId: dto.courseId,
              userId: user.id,
              roleInCourse: CourseRole.STUDENT,
            },
          });
        }

        // Send password email if random mode
        let passwordSent = false;
        if (dto.passwordMode === PasswordMode.RANDOM) {
          try {
            await this.sendPasswordEmail(user.email, user.username, plainPassword, meta.locale);
            passwordSent = true;
          } catch (error) {
            // Log but don't fail the user creation
            result.errors.push({
              email,
              error: `User created but failed to send password email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }

        result.created.push({
          email: user.email,
          username: user.username,
          userId: user.id,
          passwordSent,
        });

        // Log admin action
        await this.logAdminAction({
          adminId,
          action: 'BULK_CREATE_USER',
          targetType: 'User',
          targetId: user.id,
          details: {
            email: user.email,
            username: user.username,
            autoVerify: dto.autoVerify,
            passwordMode: dto.passwordMode,
            courseId: dto.courseId ?? null,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      } catch (error) {
        result.errors.push({
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    // Get local part of email and normalize
    const localPart = email.split('@')[0].toLowerCase();

    // Only keep lowercase letters, numbers, underscore, period
    // Then clean up periods (no leading/trailing/consecutive)
    let base = localPart
      .replace(/[^a-z0-9_.]/g, '')  // Keep only valid chars
      .replace(/\.{2,}/g, '.')       // Replace consecutive periods with single
      .replace(/^\./, '')            // Remove leading period
      .replace(/\.$/, '')            // Remove trailing period
      .slice(0, 20);

    // Ensure base has at least one letter or number and min length 3
    if (!/[a-z0-9]/.test(base)) {
      base = 'user';
    }
    if (base.length < 3) {
      base = base.padEnd(3, '0');
    }

    // Validate against the username regex
    const isValid = (name: string) =>
      /^(?!\.)(?!.*\.\.)(?=.*[a-z0-9])[a-z0-9._]+(?<!\.)$/.test(name) &&
      name.length >= 3 &&
      name.length <= 30;

    // Check if username exists
    if (isValid(base)) {
      const existing = await this.prisma.user.findUnique({
        where: { username: base },
        select: { id: true },
      });

      if (!existing) {
        return base;
      }
    }

    // Add random suffix
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = randomBytes(3).toString('hex').toLowerCase();
      // Ensure base + suffix fits in 30 chars (base + '_' + 6 chars = 7)
      const trimmedBase = base.replace(/\.$/, '').slice(0, 23);
      const candidate = `${trimmedBase}_${suffix}`;

      if (!isValid(candidate)) continue;

      const exists = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!exists) {
        return candidate;
      }
    }

    // Fallback: use timestamp-based username
    const ts = Date.now().toString(36).toLowerCase();
    const fallback = `user_${ts}`;
    return fallback.slice(0, 30);
  }

  private generateRandomPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  private async sendPasswordEmail(
    email: string,
    username: string,
    password: string,
    locale?: 'zh-TW' | 'en',
  ) {
    const isZhTW = locale === 'zh-TW';
    const subject = isZhTW
      ? '【NOJ Team4】您的帳號已建立'
      : '[NOJ Team4] Your account has been created';

    const text = isZhTW
      ? [
          `嗨 ${username}，`,
          '',
          '您的 NOJ Team4 帳號已由管理員建立。',
          '',
          `帳號：${username}`,
          `密碼：${password}`,
          '',
          '請登入後盡快變更密碼。',
          '',
          'NOJ Team4',
        ].join('\n')
      : [
          `Hi ${username},`,
          '',
          'Your NOJ Team4 account has been created by an administrator.',
          '',
          `Username: ${username}`,
          `Password: ${password}`,
          '',
          'Please change your password after logging in.',
          '',
          'NOJ Team4',
        ].join('\n');

    const html = isZhTW
      ? [
          `<p>嗨 ${username}，</p>`,
          '<p>您的 NOJ Team4 帳號已由管理員建立。</p>',
          `<p><strong>帳號：</strong>${username}</p>`,
          `<p><strong>密碼：</strong><code>${password}</code></p>`,
          '<p>請登入後盡快變更密碼。</p>',
          '<p>NOJ Team4</p>',
        ].join('')
      : [
          `<p>Hi ${username},</p>`,
          '<p>Your NOJ Team4 account has been created by an administrator.</p>',
          `<p><strong>Username:</strong> ${username}</p>`,
          `<p><strong>Password:</strong> <code>${password}</code></p>`,
          '<p>Please change your password after logging in.</p>',
          '<p>NOJ Team4</p>',
        ].join('');

    await this.mailService.sendMail({
      to: email,
      subject,
      text,
      html,
      type: EmailSendType.GENERIC,
    });
  }

  // =========================================================================
  // List Courses (for bulk user creation)
  // =========================================================================

  async listCoursesForSelection() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        term: true,
        code: true,
      },
    });
    return courses;
  }

  // =========================================================================
  // Blocked Submissions (AI Safety Check)
  // =========================================================================

  async listBlockedSubmissions(params: {
    page?: number;
    limit?: number;
    threatType?: string;
    userId?: number;
  }) {
    const page = clampInt(params.page ?? 1, 1, 1_000_000);
    const limit = clampInt(params.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BlockedSubmissionWhereInput = {};

    if (params.threatType) {
      where.threatType = params.threatType;
    }
    if (params.userId) {
      where.userId = params.userId;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.blockedSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          user: {
            select: { id: true, username: true },
          },
          problemId: true,
          problem: {
            select: { id: true, displayId: true, title: true },
          },
          sourceType: true,
          language: true,
          sourceTrunc: true,
          threatType: true,
          reason: true,
          analysis: true,
          ip: true,
          examId: true,
          createdAt: true,
        },
      }),
      this.prisma.blockedSubmission.count({ where }),
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

  async getBlockedSubmission(id: string) {
    const submission = await this.prisma.blockedSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: {
          select: { id: true, username: true, email: true },
        },
        problemId: true,
        problem: {
          select: { id: true, displayId: true, title: true },
        },
        sourceType: true,
        language: true,
        sourceTrunc: true,
        threatType: true,
        reason: true,
        analysis: true,
        aiResponse: true,
        inputTokens: true,
        outputTokens: true,
        latencyMs: true,
        ip: true,
        userAgent: true,
        examId: true,
        createdAt: true,
      },
    });

    if (!submission) {
      throw new BadRequestException('BLOCKED_SUBMISSION_NOT_FOUND');
    }

    return submission;
  }
}
