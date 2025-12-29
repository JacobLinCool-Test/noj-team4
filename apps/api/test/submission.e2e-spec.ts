/**
 * Submission E2E Tests
 * Test Cases: T-Sub-01, T-Sub-02, T-Sub-03, T-Sub-04, T-TestRun-01~04
 */

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestProblem,
  cleanupTestData,
  SAMPLE_CODE,
  TestUser,
  TestProblem,
} from './utils/test-utils';
import { ProgrammingLanguage, SubmissionType } from '@prisma/client';

describe('Submission (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let testUser: TestUser;
  let testProblem: TestProblem;
  let submissionIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);

    // Create a test user
    testUser = await createTestUser(prisma, jwtService, configService, {
      email: `sub-test-${Date.now()}@example.com`,
      username: `subtest${Date.now()}`,
    });

    // Create a test problem for submission testing
    testProblem = await createTestProblem(prisma, testUser.id, {
      displayId: `sub${Date.now().toString().slice(-4)}`,
      title: 'Submission Test Problem',
      submissionType: SubmissionType.SINGLE_FILE,
      allowedLanguages: [
        ProgrammingLanguage.C,
        ProgrammingLanguage.CPP,
        ProgrammingLanguage.PYTHON,
      ],
    });
  });

  afterAll(async () => {
    // Clean up submissions
    await prisma.submission.deleteMany({
      where: { id: { in: submissionIds } },
    });

    await cleanupTestData(prisma, {
      userIds: [testUser.id],
      problemIds: [testProblem.id],
    });
    await app.close();
  });

  describe('T-Sub-01: 提交正確程式碼', () => {
    it('應成功建立提交紀錄', async () => {
      const response = await request(app.getHttpServer())
        .post(`/problems/${testProblem.displayId}/submissions`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          language: ProgrammingLanguage.C,
          source: SAMPLE_CODE.C.add,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('language', 'C');

      submissionIds.push(response.body.id);
    });
  });

  describe('T-Sub-02: 提交錯誤程式碼', () => {
    it('編譯錯誤的程式碼應可提交（由 Judge 回報 CE）', async () => {
      const response = await request(app.getHttpServer())
        .post(`/problems/${testProblem.displayId}/submissions`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          language: ProgrammingLanguage.C,
          source: SAMPLE_CODE.C.compileError,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      submissionIds.push(response.body.id);
    });
  });

  describe('T-Sub-03: 提交無限迴圈程式', () => {
    it('無限迴圈程式應可提交（由 Judge 回報 TLE）', async () => {
      const infiniteLoopCode = `
#include <stdio.h>
int main() {
    while(1) {}
    return 0;
}`;
      const response = await request(app.getHttpServer())
        .post(`/problems/${testProblem.displayId}/submissions`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          language: ProgrammingLanguage.C,
          source: infiniteLoopCode,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      submissionIds.push(response.body.id);
    });
  });

  describe('查看提交列表', () => {
    it('應可查看自己的提交列表', async () => {
      const response = await request(app.getHttpServer())
        .get(`/problems/${testProblem.displayId}/submissions`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('應可查看單筆提交詳情', async () => {
      if (submissionIds.length === 0) {
        return; // Skip if no submissions created
      }

      const response = await request(app.getHttpServer())
        .get(`/problems/${testProblem.displayId}/submissions/${submissionIds[0]}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', submissionIds[0]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('language');
    });
  });

  describe('T-TestRun-01~02: LeetCode 式測試執行', () => {
    it('應可使用自訂輸入測試程式碼', async () => {
      const response = await request(app.getHttpServer())
        .post(`/problems/${testProblem.displayId}/submissions/test`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          language: ProgrammingLanguage.C,
          source: SAMPLE_CODE.C.add,
          customInput: '5 7',
        })
        .expect(201);

      expect(response.body).toHaveProperty('status');
      // Test run should return result or be queued
    });
  });

  describe('提交權限控制', () => {
    it('未登入用戶不應可提交', async () => {
      await request(app.getHttpServer())
        .post(`/problems/${testProblem.displayId}/submissions`)
        .send({
          language: ProgrammingLanguage.C,
          source: SAMPLE_CODE.C.add,
        })
        .expect(401);
    });
  });

  describe('不支援的語言', () => {
    it('提交不支援的語言應被拒絕', async () => {
      // Create a problem that only supports Python
      const pythonOnlyProblem = await createTestProblem(prisma, testUser.id, {
        displayId: `py${Date.now().toString().slice(-4)}`,
        title: 'Python Only Problem',
        allowedLanguages: [ProgrammingLanguage.PYTHON],
      });

      try {
        const response = await request(app.getHttpServer())
          .post(`/problems/${pythonOnlyProblem.displayId}/submissions`)
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({
            language: ProgrammingLanguage.C,
            source: SAMPLE_CODE.C.add,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      } finally {
        // Clean up
        await prisma.problem.delete({ where: { id: pythonOnlyProblem.id } });
      }
    });
  });
});
