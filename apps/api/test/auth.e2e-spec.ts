/**
 * Authentication E2E Tests
 * Test Cases: T-Auth-01, T-Auth-02, T-Auth-03, T-Auth-04
 */

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-utils';

describe('Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let testUsers: TestUser[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
  });

  afterAll(async () => {
    await cleanupTestData(prisma, {
      userIds: testUsers.map((u) => u.id),
    });
    await app.close();
  });

  describe('T-Auth-01: 使用合法 Email 與密碼註冊成功', () => {
    const testEmail = `auth-test-${Date.now()}@example.com`;
    const testUsername = `authtest${Date.now()}`;
    let createdUserId: number;

    afterAll(async () => {
      if (createdUserId) {
        await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      }
    });

    it('應該成功註冊並返回 access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          username: testUsername,
          password: 'Abcd1234!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.username).toBe(testUsername);

      createdUserId = response.body.user.id;

      // 驗證資料庫中有該用戶
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(testEmail);
    });
  });

  describe('T-Auth-02: 已存在 Email 再次註冊，應被拒絕', () => {
    let existingUser: TestUser;

    beforeAll(async () => {
      existingUser = await createTestUser(prisma, jwtService, configService, {
        email: `existing-${Date.now()}@example.com`,
        username: `existinguser${Date.now()}`,
      });
      testUsers.push(existingUser);
    });

    it('應該拒絕重複 Email 並返回錯誤訊息', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: existingUser.email,
          username: `newuser${Date.now()}`,
          password: 'Abcd1234!',
        })
        .expect(409); // Conflict

      expect(response.body.message).toBeDefined();
      // 錯誤訊息應不洩漏系統細節
      expect(response.body.message).not.toContain('SQL');
      expect(response.body.message).not.toContain('stack');
    });
  });

  describe('T-Auth-03: 未驗證信箱登入 (系統使用 ACTIVE 狀態直接登入)', () => {
    let activeUser: TestUser;

    beforeAll(async () => {
      activeUser = await createTestUser(prisma, jwtService, configService, {
        email: `active-${Date.now()}@example.com`,
        username: `activeuser${Date.now()}`,
        password: 'Abcd1234!',
      });
      testUsers.push(activeUser);
    });

    it('ACTIVE 狀態用戶應可正常登入', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: activeUser.email,
          password: 'Abcd1234!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(activeUser.email);
    });

    it('錯誤密碼應被拒絕', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: activeUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('T-Auth-04: 不同角色登入後只看到自己應該看到的功能', () => {
    let adminUser: TestUser;
    let regularUser: TestUser;

    beforeAll(async () => {
      adminUser = await createTestUser(prisma, jwtService, configService, {
        email: `admin-${Date.now()}@example.com`,
        username: `adminuser${Date.now()}`,
        role: 'ADMIN',
      });
      testUsers.push(adminUser);

      regularUser = await createTestUser(prisma, jwtService, configService, {
        email: `regular-${Date.now()}@example.com`,
        username: `regularuser${Date.now()}`,
        role: 'USER',
      });
      testUsers.push(regularUser);
    });

    it('管理員應可存取 /auth/me 並顯示 ADMIN 角色', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.role).toBe('ADMIN');
    });

    it('一般用戶應可存取 /auth/me 並顯示 USER 角色', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(200);

      expect(response.body.role).toBe('USER');
    });

    it('未授權請求應被拒絕', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('登入/登出流程', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser(prisma, jwtService, configService, {
        email: `logout-${Date.now()}@example.com`,
        username: `logoutuser${Date.now()}`,
        password: 'TestPass123!',
      });
      testUsers.push(testUser);
    });

    it('應可成功登出', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
