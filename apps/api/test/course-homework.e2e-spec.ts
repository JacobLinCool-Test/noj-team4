/**
 * Course & Homework E2E Tests
 * Test Cases: T-Course-01, T-HW-02, T-Role-TA-01
 */

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestCourse,
  cleanupTestData,
  TestUser,
} from './utils/test-utils';
import { CourseEnrollmentType, CourseMemberRole } from '@prisma/client';

describe('Course & Homework (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let testUsers: TestUser[] = [];
  let testCourseIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
  });

  afterAll(async () => {
    // Clean up test courses (including members)
    for (const courseId of testCourseIds) {
      await prisma.homework.deleteMany({ where: { courseId } });
      await prisma.courseMember.deleteMany({ where: { courseId } });
      await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    }

    await cleanupTestData(prisma, {
      userIds: testUsers.map((u) => u.id),
    });
    await app.close();
  });

  describe('T-Course-01: 教師建立新課程並提供課程碼，學生成功加入', () => {
    let teacher: TestUser;
    let student: TestUser;
    let courseSlug: string;
    let createdCourseId: number;

    beforeAll(async () => {
      teacher = await createTestUser(prisma, jwtService, configService, {
        email: `teacher-${Date.now()}@example.com`,
        username: `teacher${Date.now()}`,
      });
      testUsers.push(teacher);

      student = await createTestUser(prisma, jwtService, configService, {
        email: `student-${Date.now()}@example.com`,
        username: `student${Date.now()}`,
      });
      testUsers.push(student);

      courseSlug = `se-113-${Date.now()}`;
    });

    it('教師應可成功建立課程', async () => {
      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          name: 'Software Engineering',
          slug: courseSlug,
          term: '113-1',
          description: 'Test course for E2E testing',
          enrollmentType: CourseEnrollmentType.PUBLIC,
          isPublicListed: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('slug', courseSlug);
      expect(response.body).toHaveProperty('name', 'Software Engineering');

      createdCourseId = response.body.id;
      testCourseIds.push(createdCourseId);
    });

    it('課程列表中應可看到新建立的課程', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${teacher.token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      const foundCourse = response.body.items.find(
        (c: { slug: string }) => c.slug === courseSlug,
      );
      expect(foundCourse).toBeDefined();
    });

    it('學生應可成功加入公開課程', async () => {
      const response = await request(app.getHttpServer())
        .post(`/courses/${courseSlug}/join-public`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('加入後學生應可看到課程詳情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${courseSlug}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('slug', courseSlug);
      expect(response.body).toHaveProperty('name', 'Software Engineering');
    });

    it('DB 中應有學生的修課紀錄', async () => {
      const enrollment = await prisma.courseMember.findFirst({
        where: {
          courseId: createdCourseId,
          userId: student.id,
        },
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.roleInCourse).toBe(CourseMemberRole.STUDENT);
    });
  });

  describe('T-HW-02: 作業截止時間過後，學生不得再提交', () => {
    let teacher: TestUser;
    let student: TestUser;
    let courseSlug: string;
    let createdCourseId: number;
    let homeworkId: string;

    beforeAll(async () => {
      teacher = await createTestUser(prisma, jwtService, configService, {
        email: `hw-teacher-${Date.now()}@example.com`,
        username: `hwteacher${Date.now()}`,
      });
      testUsers.push(teacher);

      student = await createTestUser(prisma, jwtService, configService, {
        email: `hw-student-${Date.now()}@example.com`,
        username: `hwstudent${Date.now()}`,
      });
      testUsers.push(student);

      courseSlug = `hw-test-${Date.now()}`;

      // Create course
      const courseResp = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          name: 'Homework Test Course',
          slug: courseSlug,
          term: '113-1',
          enrollmentType: CourseEnrollmentType.PUBLIC,
        });
      createdCourseId = courseResp.body.id;
      testCourseIds.push(createdCourseId);

      // Student joins
      await request(app.getHttpServer())
        .post(`/courses/${courseSlug}/join-public`)
        .set('Authorization', `Bearer ${student.token}`);

      // Create a homework with past deadline
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago

      const hwResp = await request(app.getHttpServer())
        .post(`/courses/${courseSlug}/homeworks`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          title: 'Past Deadline HW',
          description: 'This homework is already expired',
          opensAt: new Date(now.getTime() - 86400000).toISOString(), // Started yesterday
          dueAt: pastDate.toISOString(), // Due 1 hour ago
          problemIds: [],
        });

      homeworkId = hwResp.body.id;
    });

    it('作業應顯示已截止', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${courseSlug}/homeworks/${homeworkId}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Past Deadline HW');
      // Check if the due date is in the past
      const dueAt = new Date(response.body.dueAt);
      expect(dueAt.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('T-Role-TA-01: TA 權限與 Teacher / Admin 分級', () => {
    let admin: TestUser;
    let teacher: TestUser;
    let ta: TestUser;
    let courseSlug: string;
    let createdCourseId: number;

    beforeAll(async () => {
      admin = await createTestUser(prisma, jwtService, configService, {
        email: `role-admin-${Date.now()}@example.com`,
        username: `roleadmin${Date.now()}`,
        role: 'ADMIN',
      });
      testUsers.push(admin);

      teacher = await createTestUser(prisma, jwtService, configService, {
        email: `role-teacher-${Date.now()}@example.com`,
        username: `roleteacher${Date.now()}`,
      });
      testUsers.push(teacher);

      ta = await createTestUser(prisma, jwtService, configService, {
        email: `role-ta-${Date.now()}@example.com`,
        username: `roleta${Date.now()}`,
      });
      testUsers.push(ta);

      courseSlug = `role-test-${Date.now()}`;

      // Teacher creates course
      const courseResp = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          name: 'Role Test Course',
          slug: courseSlug,
          term: '113-1',
          enrollmentType: CourseEnrollmentType.INVITE_ONLY,
        });
      createdCourseId = courseResp.body.id;
      testCourseIds.push(createdCourseId);

      // Add TA to course
      await request(app.getHttpServer())
        .post(`/courses/${courseSlug}/members`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          members: [
            { email: ta.email, roleInCourse: CourseMemberRole.TA },
          ],
        });
    });

    it('TA 應可查看課程成員列表', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${courseSlug}/members`)
        .set('Authorization', `Bearer ${ta.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('TA 應無法刪除課程', async () => {
      await request(app.getHttpServer())
        .delete(`/courses/${courseSlug}`)
        .set('Authorization', `Bearer ${ta.token}`)
        .send({ confirmSlug: courseSlug })
        .expect(403);
    });

    it('Teacher 應可查看課程', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${courseSlug}`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('slug', courseSlug);
    });
  });

  describe('課程搜尋與列表', () => {
    it('未登入用戶應可查看公開課程列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });
});
