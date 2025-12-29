/**
 * Test Utilities for E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import { UserRole, ProgrammingLanguage, SubmissionType } from '@prisma/client';
import * as argon2 from 'argon2';

export interface TestUser {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  token: string;
}

export interface TestProblem {
  id: string;
  displayId: string;
  title: string;
  submissionType: SubmissionType;
}

export interface TestExam {
  id: string;
  title: string;
  code: string;
  sessionToken?: string;
}

/**
 * Create and initialize a NestJS test application
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  return app;
}

/**
 * Create a test user and generate JWT token
 */
export async function createTestUser(
  prisma: PrismaService,
  jwtService: JwtService,
  configService: ConfigService,
  options: {
    email?: string;
    username?: string;
    role?: UserRole;
    password?: string;
  } = {},
): Promise<TestUser> {
  const email = options.email || `test-${Date.now()}@example.com`;
  const username = options.username || `testuser-${Date.now()}`;
  const role = options.role || UserRole.USER;
  const password = options.password || 'password123';

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  const secret = configService.get<string>('JWT_ACCESS_SECRET') || 'test-secret';
  const token = jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    { secret, expiresIn: '1h' },
  );

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    token,
  };
}

/**
 * Create a test problem
 */
export async function createTestProblem(
  prisma: PrismaService,
  ownerId: number,
  options: {
    displayId?: string;
    title?: string;
    submissionType?: SubmissionType;
    allowedLanguages?: ProgrammingLanguage[];
    pipelineConfig?: any;
  } = {},
): Promise<TestProblem> {
  const displayId = options.displayId || `t${Date.now().toString().slice(-4)}`;
  const title = options.title || `Test Problem ${displayId}`;
  const submissionType = options.submissionType || SubmissionType.SINGLE_FILE;
  const allowedLanguages = options.allowedLanguages || [
    ProgrammingLanguage.C,
    ProgrammingLanguage.CPP,
    ProgrammingLanguage.JAVA,
    ProgrammingLanguage.PYTHON,
  ];

  const problem = await prisma.problem.create({
    data: {
      displayId,
      title,
      description: 'Test problem description',
      input: 'Test input format',
      output: 'Test output format',
      sampleInputs: ['1 2'],
      sampleOutputs: ['3'],
      submissionType,
      allowedLanguages,
      ownerId,
      pipelineConfig: options.pipelineConfig,
    },
  });

  return {
    id: problem.id,
    displayId: problem.displayId,
    title: problem.title,
    submissionType: problem.submissionType,
  };
}

/**
 * Create a test course with the user as teacher
 */
export async function createTestCourse(
  prisma: PrismaService,
  teacherId: number,
  options: {
    name?: string;
    code?: string;
  } = {},
): Promise<{ id: number; name: string }> {
  const name = options.name || `Test Course ${Date.now()}`;
  const code = options.code || `TC${Date.now().toString().slice(-6)}`;

  const course = await prisma.course.create({
    data: {
      name,
      code,
      term: '2024-Fall',
      description: 'Test course',
    },
  });

  // Add teacher as course member
  await prisma.courseMember.create({
    data: {
      courseId: course.id,
      userId: teacherId,
      roleInCourse: 'TEACHER',
    },
  });

  return {
    id: course.id,
    name: course.name,
  };
}

/**
 * Generate a random 10-char alphanumeric exam ID
 */
function generateExamId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a test exam
 */
export async function createTestExam(
  prisma: PrismaService,
  jwtService: JwtService,
  configService: ConfigService,
  options: {
    courseId: number;
    problemIds: string[];
    studentId: number;
    startsAt?: Date;
    endsAt?: Date;
  },
): Promise<TestExam> {
  const now = new Date();
  const startsAt = options.startsAt || new Date(now.getTime() - 60000); // Started 1 min ago
  const endsAt = options.endsAt || new Date(now.getTime() + 3600000); // Ends in 1 hour

  const exam = await prisma.exam.create({
    data: {
      id: generateExamId(),
      title: `Test Exam ${Date.now()}`,
      description: 'Test exam',
      courseId: options.courseId,
      problemIds: options.problemIds,
      startsAt,
      endsAt,
      ipAllowList: [],
      scoreboardVisible: true,
    },
  });

  // Generate exam code (6 characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
  const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
  }

  const examCode = await prisma.examCode.create({
    data: {
      code,
      examId: exam.id,
      studentId: options.studentId,
    },
  });

  // Generate session token
  const secret = configService.get<string>('JWT_ACCESS_SECRET') || 'test-secret';
  const sessionToken = jwtService.sign(
    {
      sub: options.studentId,
      examId: exam.id,
      code: examCode.code,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(endsAt.getTime() / 1000),
    },
    { secret },
  );

  // Update exam code with session token
  await prisma.examCode.update({
    where: { code },
    data: { sessionToken },
  });

  return {
    id: exam.id,
    title: exam.title,
    code: examCode.code,
    sessionToken,
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  prisma: PrismaService,
  options: {
    userIds?: number[];
    problemIds?: string[];
    courseIds?: number[];
    examIds?: string[];
  },
): Promise<void> {
  // Delete in correct order due to foreign key constraints
  if (options.examIds?.length) {
    await prisma.examCode.deleteMany({
      where: { examId: { in: options.examIds } },
    });
    await prisma.exam.deleteMany({
      where: { id: { in: options.examIds } },
    });
  }

  if (options.problemIds?.length) {
    await prisma.submission.deleteMany({
      where: { problemId: { in: options.problemIds } },
    });
    await prisma.problem.deleteMany({
      where: { id: { in: options.problemIds } },
    });
  }

  if (options.courseIds?.length) {
    await prisma.courseMember.deleteMany({
      where: { courseId: { in: options.courseIds } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: options.courseIds } },
    });
  }

  if (options.userIds?.length) {
    await prisma.user.deleteMany({
      where: { id: { in: options.userIds } },
    });
  }
}

/**
 * Sample code for different languages
 */
export const SAMPLE_CODE = {
  C: {
    hello: `#include <stdio.h>
int main() {
    printf("Hello World\\n");
    return 0;
}`,
    add: `#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`,
    error: `#include <stdio.h>
int main() {
    printf("Wrong Answer\\n");
    return 0;
}`,
    compileError: `int main() {
    this is not valid C code
}`,
  },
  CPP: {
    hello: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello World" << endl;
    return 0;
}`,
    add: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
  },
  JAVA: {
    hello: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
    add: `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`,
  },
  PYTHON: {
    hello: `print("Hello World")`,
    add: `a, b = map(int, input().split())
print(a + b)`,
  },
};

/**
 * Create a simple ZIP file buffer for multi-file tests
 */
export function createZipBuffer(files: { name: string; content: string }[]): Buffer {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();

  for (const file of files) {
    zip.addFile(file.name, Buffer.from(file.content, 'utf8'));
  }

  return zip.toBuffer();
}

/**
 * Sample ZIP contents for different scenarios
 */
export const SAMPLE_ZIP = {
  withMakefile: [
    {
      name: 'Makefile',
      content: `CC = gcc
CFLAGS = -O2 -Wall

main: foo.o
\t$(CC) -o main foo.o

foo.o: foo.c
\t$(CC) $(CFLAGS) -c foo.c

clean:
\trm -f *.o main
`,
    },
    {
      name: 'foo.c',
      content: `#include <stdio.h>
int main() {
    printf("Hello from Makefile project\\n");
    return 0;
}
`,
    },
  ],
  withoutMakefile: [
    {
      name: 'main.c',
      content: `#include <stdio.h>
int main() {
    printf("Hello World\\n");
    return 0;
}
`,
    },
  ],
  noMainNoMakefile: [
    {
      name: 'foo.c',
      content: `void foo() {}`,
    },
  ],
};
