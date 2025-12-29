/**
 * API Token E2E Tests
 * Test Cases: T-Token-01, T-Token-02, T-Token-03, T-Token-04
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
  TestUser,
  TestProblem,
} from './utils/test-utils';
import { TokenScope } from '@prisma/client';

describe('API Token (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let testUser: TestUser;
  let testProblem: TestProblem;
  let createdTokenIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);

    // Create a test user
    testUser = await createTestUser(prisma, jwtService, configService, {
      email: `token-test-${Date.now()}@example.com`,
      username: `tokentest${Date.now()}`,
    });

    // Create a test problem for scope testing
    testProblem = await createTestProblem(prisma, testUser.id, {
      title: 'Token Test Problem',
    });
  });

  afterAll(async () => {
    // Clean up created tokens
    await prisma.apiToken.deleteMany({
      where: { id: { in: createdTokenIds } },
    });

    await cleanupTestData(prisma, {
      userIds: [testUser.id],
      problemIds: [testProblem.id],
    });
    await app.close();
  });

  describe('T-Token-01: 使用者建立 Token，金鑰只顯示一次', () => {
    let createdToken: { id: number; token: string };

    it('應成功建立 Token 並返回完整金鑰', async () => {
      const response = await request(app.getHttpServer())
        .post('/api-tokens')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Token 01',
          scopes: [TokenScope.READ_SUBMISSIONS],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('name', 'Test Token 01');
      expect(response.body.token).toMatch(/^noj_/); // Token should start with prefix

      createdToken = response.body;
      createdTokenIds.push(createdToken.id);
    });

    it('列出 Token 時不應顯示完整金鑰', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-tokens')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const foundToken = response.body.find(
        (t: { id: number }) => t.id === createdToken.id,
      );
      expect(foundToken).toBeDefined();
      // Token should not be returned in list view (only shown once at creation)
      expect(foundToken.token).toBeUndefined();
      expect(foundToken).toHaveProperty('lastFourChars');
    });
  });

  describe('T-Token-02: 用正確 Token 呼叫受保護 API，成功取得資料', () => {
    let apiToken: string;

    beforeAll(async () => {
      // Create a token with READ_USER scope
      const response = await request(app.getHttpServer())
        .post('/api-tokens')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Token 02',
          scopes: [TokenScope.READ_USER],
        });

      apiToken = response.body.token;
      createdTokenIds.push(response.body.id);
    });

    it('應可使用 API Token 存取 /auth/me', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
    });
  });

  describe('T-Token-03: 撤銷 Token 後，再用同一 Token 呼叫 API 應被拒絕', () => {
    let tokenId: number;
    let apiToken: string;

    beforeAll(async () => {
      // Create a token to revoke
      const response = await request(app.getHttpServer())
        .post('/api-tokens')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Token 03 - To Be Revoked',
          scopes: [TokenScope.READ_USER],
        });

      tokenId = response.body.id;
      apiToken = response.body.token;
    });

    it('撤銷前應可正常使用', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);
    });

    it('應可成功撤銷 Token', async () => {
      await request(app.getHttpServer())
        .delete(`/api-tokens/${tokenId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(204);
    });

    it('撤銷後應無法使用該 Token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(401);

      // 錯誤訊息不應洩漏後端實作細節
      expect(response.body.message).toBeDefined();
      expect(response.body.message).not.toContain('stack');
    });
  });

  describe('T-Token-04: Scope 為 read:submissions 的 Token 無法修改題目', () => {
    let readOnlyToken: string;

    beforeAll(async () => {
      // Create a token with only READ_SUBMISSIONS scope
      const response = await request(app.getHttpServer())
        .post('/api-tokens')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Token 04 - Read Only',
          scopes: [TokenScope.READ_SUBMISSIONS],
        });

      readOnlyToken = response.body.token;
      createdTokenIds.push(response.body.id);
    });

    it('READ_SUBMISSIONS Token 不應可修改題目', async () => {
      // Try to update problem - should fail due to insufficient scope
      const response = await request(app.getHttpServer())
        .patch(`/problems/${testProblem.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({
          title: 'Modified Title',
        })
        .expect(403);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('未授權存取', () => {
    it('無 Token 時不應可存取 /api-tokens', async () => {
      await request(app.getHttpServer()).get('/api-tokens').expect(401);
    });

    it('無效 Token 應被拒絕', async () => {
      await request(app.getHttpServer())
        .get('/api-tokens')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);
    });
  });
});
