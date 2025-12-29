import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../minio/minio.service';
import {
  ProblemVisibility,
  ProgrammingLanguage,
  CourseStatus,
  CourseEnrollmentType,
  CourseRole,
  AnnouncementScope,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import AdmZip from 'adm-zip';

import {
  DemoDataResultDto,
  ClearDemoDataResultDto,
  DemoDataStatusDto,
  AdminUserDto,
  DemoUserDto,
  DemoProblemDto,
  DemoCourseDto,
} from '../dto/demo-data.dto';
import {
  PUBLIC_PROBLEM_TEMPLATES,
  PUBLIC_PROBLEM_LANGUAGES,
  ProblemTemplate,
} from './problem-templates';
import {
  COURSE_TEMPLATES,
  COURSE_PROBLEM_LANGUAGES,
  CourseTemplate,
} from './course-templates';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

interface TestdataCase {
  name: string;
  inputFile: string;
  outputFile: string;
  points: number;
  isSample: boolean;
  timeLimitMs: number;
  memoryLimitKb: number;
}

interface TestdataManifest {
  version: string;
  cases: TestdataCase[];
  defaultTimeLimitMs: number;
  defaultMemoryLimitKb: number;
}

@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /**
   * Generate all demo data
   */
  async generateDemoData(
    adminId: number,
    meta: RequestMeta,
  ): Promise<DemoDataResultDto> {
    this.logger.log('Starting demo data generation...');

    const result: DemoDataResultDto = {
      adminUser: { username: '', email: '', password: null, isNew: false },
      demoUsers: [],
      publicProblems: [],
      courses: [],
      summary: {
        usersCreated: 0,
        usersSkipped: 0,
        problemsCreated: 0,
        problemsSkipped: 0,
        coursesCreated: 0,
        coursesSkipped: 0,
      },
    };

    // Step 1: Create or get admin user
    const adminUserResult = await this.createAdminUser();
    result.adminUser = adminUserResult;
    if (adminUserResult.isNew) {
      result.summary.usersCreated++;
    } else {
      result.summary.usersSkipped++;
    }

    // Step 2: Create demo users
    const demoUsersResult = await this.createDemoUsers();
    result.demoUsers = demoUsersResult.users;
    result.summary.usersCreated += demoUsersResult.created;
    result.summary.usersSkipped += demoUsersResult.skipped;

    // Step 3: Create public problems
    const publicProblemsResult = await this.createPublicProblems(
      adminUserResult.userId,
    );
    result.publicProblems = publicProblemsResult.problems;
    result.summary.problemsCreated += publicProblemsResult.created;
    result.summary.problemsSkipped += publicProblemsResult.skipped;

    // Step 4: Create courses with content
    const demoUserIds = demoUsersResult.userIds;
    const coursesResult = await this.createCourses(
      adminUserResult.userId,
      demoUserIds,
    );
    result.courses = coursesResult.courses;
    result.summary.coursesCreated += coursesResult.created;
    result.summary.coursesSkipped += coursesResult.skipped;
    result.summary.problemsCreated += coursesResult.problemsCreated;

    // Log admin action
    await this.logAdminAction(adminId, 'GENERATE_DEMO_DATA', meta, {
      usersCreated: result.summary.usersCreated,
      problemsCreated: result.summary.problemsCreated,
      coursesCreated: result.summary.coursesCreated,
    });

    this.logger.log('Demo data generation completed');
    return result;
  }

  /**
   * Clear all demo data
   */
  async clearDemoData(
    adminId: number,
    meta: RequestMeta,
  ): Promise<ClearDemoDataResultDto> {
    this.logger.log('Starting demo data cleanup...');

    let usersDeleted = 0;
    let problemsDeleted = 0;
    let coursesDeleted = 0;

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // 1. Find and delete demo courses
      const demoCourses = await tx.course.findMany({
        where: {
          slug: {
            in: COURSE_TEMPLATES.map((c) => c.slug),
          },
        },
        include: {
          problems: true,
        },
      });

      for (const course of demoCourses) {
        // Get course problem IDs
        const courseProblemIds = course.problems.map((cp) => cp.problemId);

        // Delete course (cascades to members, announcements, homeworks)
        await tx.course.delete({ where: { id: course.id } });
        coursesDeleted++;

        // Delete UNLISTED problems that were in this course
        for (const problemId of courseProblemIds) {
          const problem = await tx.problem.findUnique({
            where: { id: problemId },
            select: { visibility: true },
          });
          if (problem?.visibility === ProblemVisibility.UNLISTED) {
            // Delete testdata first
            await tx.problemTestdata.deleteMany({
              where: { problemId },
            });
            await tx.problem.delete({ where: { id: problemId } });
            problemsDeleted++;
          }
        }
      }

      // 2. Delete public demo problems (a001-a010)
      const publicProblemIds = PUBLIC_PROBLEM_TEMPLATES.map((p) => p.displayId);
      const publicProblems = await tx.problem.findMany({
        where: {
          displayId: { in: publicProblemIds },
        },
      });

      for (const problem of publicProblems) {
        await tx.problemTestdata.deleteMany({
          where: { problemId: problem.id },
        });
        await tx.problem.delete({ where: { id: problem.id } });
        problemsDeleted++;
      }

      // 3. Delete demo users (demo01-demo10)
      const demoEmails = Array.from(
        { length: 10 },
        (_, i) => `demo${(i + 1).toString().padStart(2, '0')}@noj4.dev`,
      );
      const demoUsers = await tx.user.findMany({
        where: { email: { in: demoEmails } },
      });
      for (const user of demoUsers) {
        await tx.user.delete({ where: { id: user.id } });
        usersDeleted++;
      }

      // 4. Delete admin@noj4.dev user
      const adminUser = await tx.user.findUnique({
        where: { email: 'admin@noj4.dev' },
      });
      if (adminUser) {
        await tx.user.delete({ where: { id: adminUser.id } });
        usersDeleted++;
      }
    });

    // Log admin action
    await this.logAdminAction(adminId, 'CLEAR_DEMO_DATA', meta, {
      usersDeleted,
      problemsDeleted,
      coursesDeleted,
    });

    this.logger.log('Demo data cleanup completed');
    return {
      usersDeleted,
      problemsDeleted,
      coursesDeleted,
      success: true,
    };
  }

  /**
   * Get current demo data status
   */
  async getDemoDataStatus(): Promise<DemoDataStatusDto> {
    const adminUser = await this.prisma.user.findUnique({
      where: { email: 'admin@noj4.dev' },
    });

    const demoEmails = Array.from(
      { length: 10 },
      (_, i) => `demo${(i + 1).toString().padStart(2, '0')}@noj4.dev`,
    );
    const demoUserCount = await this.prisma.user.count({
      where: { email: { in: demoEmails } },
    });

    const publicProblemIds = PUBLIC_PROBLEM_TEMPLATES.map((p) => p.displayId);
    const publicProblemCount = await this.prisma.problem.count({
      where: { displayId: { in: publicProblemIds } },
    });

    const courseSlugs = COURSE_TEMPLATES.map((c) => c.slug);
    const courseCount = await this.prisma.course.count({
      where: { slug: { in: courseSlugs } },
    });

    return {
      hasAdminUser: !!adminUser,
      adminUserId: adminUser?.id ?? null,
      demoUserCount,
      publicProblemCount,
      courseCount,
    };
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  private async createAdminUser(): Promise<
    AdminUserDto & { userId: number }
  > {
    const email = 'admin@noj4.dev';
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        username: existing.username,
        email: existing.email,
        password: null,
        isNew: false,
        userId: existing.id,
      };
    }

    const password = this.generatePassword(20);
    const passwordHash = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: {
        username: 'admin',
        email,
        passwordHash,
        role: 'USER', // Not ADMIN!
        emailVerifiedAt: new Date(),
      },
    });

    return {
      username: user.username,
      email: user.email,
      password,
      isNew: true,
      userId: user.id,
    };
  }

  private async createDemoUsers(): Promise<{
    users: DemoUserDto[];
    userIds: number[];
    created: number;
    skipped: number;
  }> {
    const users: DemoUserDto[] = [];
    const userIds: number[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 1; i <= 10; i++) {
      const num = i.toString().padStart(2, '0');
      const email = `demo${num}@noj4.dev`;
      const username = `demo${num}`;

      const existing = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        userIds.push(existing.id);
        skipped++;
        continue;
      }

      const password = this.generatePassword(20);
      const passwordHash = await argon2.hash(password);

      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: 'USER',
          emailVerifiedAt: new Date(),
        },
      });

      users.push({ username, email, password });
      userIds.push(user.id);
      created++;
    }

    return { users, userIds, created, skipped };
  }

  private async createPublicProblems(ownerId: number): Promise<{
    problems: DemoProblemDto[];
    created: number;
    skipped: number;
  }> {
    const problems: DemoProblemDto[] = [];
    let created = 0;
    let skipped = 0;

    for (const template of PUBLIC_PROBLEM_TEMPLATES) {
      const existing = await this.prisma.problem.findUnique({
        where: { displayId: template.displayId },
      });

      if (existing) {
        problems.push({
          displayId: template.displayId,
          title: template.titleZh,
          isNew: false,
        });
        skipped++;
        continue;
      }

      // Create the problem
      const problem = await this.prisma.problem.create({
        data: {
          displayId: template.displayId,
          ownerId,
          visibility: ProblemVisibility.PUBLIC,
          difficulty: template.difficulty,
          allowedLanguages: PUBLIC_PROBLEM_LANGUAGES,
          canViewStdout: true,
          // Main content (Chinese as source)
          title: template.titleZh,
          description: template.descriptionZh,
          input: template.inputZh,
          output: template.outputZh,
          hint: template.hintZh || null,
          // Bilingual fields
          titleZh: template.titleZh,
          titleEn: template.titleEn,
          descriptionZh: template.descriptionZh,
          descriptionEn: template.descriptionEn,
          inputZh: template.inputZh,
          inputEn: template.inputEn,
          outputZh: template.outputZh,
          outputEn: template.outputEn,
          hintZh: template.hintZh || null,
          hintEn: template.hintEn || null,
          tagsZh: template.tagsZh,
          tagsEn: template.tagsEn,
          tags: template.tagsZh,
          sourceLanguage: 'zh',
          translationStatus: 'COMPLETED',
          // Sample cases
          sampleInputs: template.sampleCases.map((c) => c.input),
          sampleOutputs: template.sampleCases.map((c) => c.output),
        },
      });

      // Generate and upload testdata
      await this.generateAndUploadTestdata(problem.id, template, ownerId);

      problems.push({
        displayId: template.displayId,
        title: template.titleZh,
        isNew: true,
      });
      created++;
    }

    return { problems, created, skipped };
  }

  private async createCourses(
    teacherId: number,
    memberIds: number[],
  ): Promise<{
    courses: DemoCourseDto[];
    created: number;
    skipped: number;
    problemsCreated: number;
  }> {
    const courses: DemoCourseDto[] = [];
    let created = 0;
    let skipped = 0;
    let problemsCreated = 0;

    for (const template of COURSE_TEMPLATES) {
      const existing = await this.prisma.course.findUnique({
        where: { slug: template.slug },
      });

      if (existing) {
        courses.push({
          slug: template.slug,
          name: template.name,
          problemCount: 0,
          memberCount: 0,
          homeworkCount: 0,
          announcementCount: 0,
          isNew: false,
        });
        skipped++;
        continue;
      }

      // Create the course
      const course = await this.prisma.course.create({
        data: {
          code: template.code,
          slug: template.slug,
          name: template.name,
          term: '114-1',
          description: template.description,
          status: CourseStatus.ACTIVE,
          enrollmentType: CourseEnrollmentType.PUBLIC,
          isPublicListed: true,
          teacherId,
          createdById: teacherId,
        },
      });

      // Add teacher as member
      await this.prisma.courseMember.create({
        data: {
          courseId: course.id,
          userId: teacherId,
          roleInCourse: CourseRole.TEACHER,
        },
      });

      // Randomly assign 5-10 students
      const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
      const memberCount = Math.floor(Math.random() * 6) + 5; // 5-10
      const selectedMembers = shuffled.slice(0, memberCount);

      for (const userId of selectedMembers) {
        await this.prisma.courseMember.create({
          data: {
            courseId: course.id,
            userId,
            roleInCourse: CourseRole.STUDENT,
          },
        });
      }

      // Create course problems
      const courseProblemIds = await this.createCourseProblems(
        course.id,
        teacherId,
        template,
      );
      problemsCreated += courseProblemIds.length;

      // Create announcements
      await this.createCourseAnnouncements(course.id, teacherId, template);

      // Create homeworks
      await this.createCourseHomeworks(
        course.id,
        courseProblemIds,
        teacherId,
        template,
      );

      courses.push({
        slug: template.slug,
        name: template.name,
        problemCount: courseProblemIds.length,
        memberCount: selectedMembers.length + 1, // +1 for teacher
        homeworkCount: template.homeworks.length,
        announcementCount: template.announcements.length,
        isNew: true,
      });
      created++;
    }

    return { courses, created, skipped, problemsCreated };
  }

  private async createCourseProblems(
    courseId: number,
    ownerId: number,
    courseTemplate: CourseTemplate,
  ): Promise<string[]> {
    const problemIds: string[] = [];

    for (const template of courseTemplate.problems) {
      // Check if problem already exists
      const existing = await this.prisma.problem.findUnique({
        where: { displayId: template.displayId },
      });

      if (existing) {
        // Link existing problem to course
        await this.prisma.courseProblem.upsert({
          where: {
            courseId_problemId: {
              courseId,
              problemId: existing.id,
            },
          },
          update: {},
          create: {
            courseId,
            problemId: existing.id,
            quota: -1,
            addedById: ownerId,
          },
        });
        problemIds.push(existing.id);
        continue;
      }

      // Create new problem
      const problem = await this.prisma.problem.create({
        data: {
          displayId: template.displayId,
          ownerId,
          visibility: ProblemVisibility.UNLISTED,
          difficulty: template.difficulty,
          allowedLanguages: COURSE_PROBLEM_LANGUAGES,
          canViewStdout: true,
          // Main content
          title: template.titleZh,
          description: template.descriptionZh,
          input: template.inputZh,
          output: template.outputZh,
          hint: template.hintZh || null,
          // Bilingual
          titleZh: template.titleZh,
          titleEn: template.titleEn,
          descriptionZh: template.descriptionZh,
          descriptionEn: template.descriptionEn,
          inputZh: template.inputZh,
          inputEn: template.inputEn,
          outputZh: template.outputZh,
          outputEn: template.outputEn,
          hintZh: template.hintZh || null,
          hintEn: template.hintEn || null,
          tagsZh: template.tagsZh,
          tagsEn: template.tagsEn,
          tags: template.tagsZh,
          sourceLanguage: 'zh',
          translationStatus: 'COMPLETED',
          // Sample cases
          sampleInputs: template.sampleCases.map((c) => c.input),
          sampleOutputs: template.sampleCases.map((c) => c.output),
        },
      });

      // Link to course
      await this.prisma.courseProblem.create({
        data: {
          courseId,
          problemId: problem.id,
          quota: -1,
          addedById: ownerId,
        },
      });

      // Generate testdata
      await this.generateAndUploadTestdata(problem.id, template, ownerId);

      problemIds.push(problem.id);
    }

    return problemIds;
  }

  private async createCourseAnnouncements(
    courseId: number,
    authorId: number,
    courseTemplate: CourseTemplate,
  ): Promise<void> {
    for (const ann of courseTemplate.announcements) {
      await this.prisma.announcement.create({
        data: {
          scope: AnnouncementScope.COURSE,
          courseId,
          title: ann.title,
          content: ann.content,
          isPinned: ann.isPinned,
          authorId,
        },
      });
    }
  }

  private async createCourseHomeworks(
    courseId: number,
    problemIds: string[],
    createdById: number,
    courseTemplate: CourseTemplate,
  ): Promise<void> {
    const startAt = new Date('2025-12-29T00:00:00+08:00');
    const endAt = new Date('2025-12-29T23:59:59+08:00');

    for (const hw of courseTemplate.homeworks) {
      const homework = await this.prisma.homework.create({
        data: {
          courseId,
          title: hw.title,
          description: hw.description,
          startAt,
          endAt,
          createdById,
        },
      });

      // Add problems to homework
      for (let i = 0; i < hw.problemIndices.length; i++) {
        const problemIndex = hw.problemIndices[i];
        if (problemIndex < problemIds.length) {
          await this.prisma.homeworkProblem.create({
            data: {
              homeworkId: homework.id,
              problemId: problemIds[problemIndex],
              order: i,
            },
          });
        }
      }
    }
  }

  private async generateAndUploadTestdata(
    problemId: string,
    template: ProblemTemplate,
    uploadedById: number,
  ): Promise<void> {
    const zip = new AdmZip();
    const cases: TestdataCase[] = [];

    // Generate 3 sample cases
    for (let i = 0; i < 3; i++) {
      const { input, output } = template.generateTestCase(i, true);
      const inputFile = `00${i.toString().padStart(2, '0')}.in`;
      const outputFile = `00${i.toString().padStart(2, '0')}.out`;

      zip.addFile(inputFile, Buffer.from(input));
      zip.addFile(outputFile, Buffer.from(output));

      cases.push({
        name: `Sample ${i + 1}`,
        inputFile,
        outputFile,
        points: 0,
        isSample: true,
        timeLimitMs: 1000,
        memoryLimitKb: 262144,
      });
    }

    // Generate 10 hidden test cases
    for (let i = 0; i < 10; i++) {
      const { input, output } = template.generateTestCase(i, false);
      const inputFile = `01${i.toString().padStart(2, '0')}.in`;
      const outputFile = `01${i.toString().padStart(2, '0')}.out`;

      zip.addFile(inputFile, Buffer.from(input));
      zip.addFile(outputFile, Buffer.from(output));

      cases.push({
        name: `Test ${i + 1}`,
        inputFile,
        outputFile,
        points: 10, // 10 points each = 100 total
        isSample: false,
        timeLimitMs: 1000,
        memoryLimitKb: 262144,
      });
    }

    // Create manifest
    const manifest: TestdataManifest = {
      version: '1.0',
      cases,
      defaultTimeLimitMs: 1000,
      defaultMemoryLimitKb: 262144,
    };

    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

    // Upload to MinIO
    const zipBuffer = zip.toBuffer();
    const zipKey = `testdata/${problemId}/v1/testdata.zip`;

    await this.minio.putObject('noj-testdata', zipKey, zipBuffer, {
      'Content-Type': 'application/zip',
    });

    // Create database record
    await this.prisma.problemTestdata.create({
      data: {
        problemId,
        version: 1,
        zipKey,
        manifest: manifest as any,
        isActive: true,
        uploadedById,
      },
    });
  }

  /**
   * Generate a random password with alphanumeric characters only
   */
  private generatePassword(length: number): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Log admin action
   */
  private async logAdminAction(
    adminId: number,
    action: string,
    meta: RequestMeta,
    details: Record<string, any>,
  ): Promise<void> {
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action,
        details,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  }
}
