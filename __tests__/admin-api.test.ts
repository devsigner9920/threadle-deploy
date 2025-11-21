/**
 * Admin API Tests
 * Tests for admin endpoints, authorization, and RBAC
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ConfigService } from '../server/config/ConfigService.js';
import { JWTAuth } from '../server/user/jwtAuth.js';
import { setPrismaClient } from '../server/database/client.js';
import adminRoutes from '../server/routes/admin.js';
import { UserRole, Language } from '@prisma/client';

describe('Admin API Endpoints', () => {
  let app: Express;
  let configService: ConfigService;
  let jwtAuth: JWTAuth;
  let adminToken: string;
  let regularUserToken: string;
  let adminUserId: string;
  let regularUserId: string;
  let prisma: PrismaClient;
  const testDbPath = path.join(__dirname, '../data/admin-test.db');

  beforeAll(async () => {
    // Set up test database
    const testDbUrl = `file:${testDbPath}`;
    process.env['DATABASE_URL'] = testDbUrl;

    // Create adapter and Prisma client
    const adapter = new PrismaLibSql({ url: testDbUrl });
    prisma = new PrismaClient({ adapter });

    // Set as the global Prisma client for routes to use
    setPrismaClient(prisma);

    // Run migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDbUrl },
    });

    // Initialize config service
    configService = new ConfigService();
    configService.load();
    jwtAuth = new JWTAuth(configService);

    // Set up Express app for testing
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/v1/admin', adminRoutes);

    // Clean up database
    await prisma.userFeedback.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        slackUserId: 'U_ADMIN_TEST',
        slackWorkspaceId: 'T123456',
        role: UserRole.Product,
        language: Language.English,
        isAdmin: true,
      },
    });
    adminUserId = adminUser.id;

    const regularUser = await prisma.user.create({
      data: {
        slackUserId: 'U_REGULAR_TEST',
        slackWorkspaceId: 'T123456',
        role: UserRole.Design,
        language: Language.English,
        isAdmin: false,
      },
    });
    regularUserId = regularUser.id;

    // Generate JWT tokens
    adminToken = jwtAuth.generateToken({
      userId: adminUserId,
      slackUserId: 'U_ADMIN_TEST',
      isAdmin: true,
    });

    regularUserToken = jwtAuth.generateToken({
      userId: regularUserId,
      slackUserId: 'U_REGULAR_TEST',
      isAdmin: false,
    });

    // Create some test translations for usage stats
    const conversation = await prisma.conversation.create({
      data: {
        slackChannelId: 'C123456',
        slackThreadTs: '1234567890.123456',
        messageCount: 3,
        firstMessageAt: new Date('2024-01-01'),
        lastMessageAt: new Date('2024-01-01'),
      },
    });

    // Create translations for both users
    await prisma.translation.create({
      data: {
        conversationId: conversation.id,
        requestedByUserId: adminUserId,
        originalMessages: JSON.stringify([{ text: 'Test message' }]),
        translatedContent: 'Test translation for admin',
        targetRole: UserRole.Design,
        language: 'English',
        llmProvider: 'openai',
        tokenUsage: 150,
        createdAt: new Date('2024-01-01'),
      },
    });

    await prisma.translation.create({
      data: {
        conversationId: conversation.id,
        requestedByUserId: regularUserId,
        originalMessages: JSON.stringify([{ text: 'Test message 2' }]),
        translatedContent: 'Test translation for regular user',
        targetRole: UserRole.Engineering_Backend,
        language: 'English',
        llmProvider: 'openai',
        tokenUsage: 200,
        createdAt: new Date('2024-01-02'),
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.userFeedback.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();

    // Delete test database files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('Admin Authorization Middleware', () => {
    it('should require admin role for admin endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 403 Forbidden for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('Admin privileges required');
    });

    it('should return 401 Unauthorized when no token provided', async () => {
      const response = await request(app).get('/api/v1/admin/settings');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/v1/admin/settings', () => {
    it('should return global configuration for admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings).toBeDefined();
      expect(response.body.settings).toHaveProperty('setupCompleted');
      expect(response.body.settings).toHaveProperty('port');
      expect(response.body.settings).toHaveProperty('llmProvider');

      // Should not expose sensitive fields like secrets
      expect(response.body.settings).not.toHaveProperty('slackSigningSecret');
      expect(response.body.settings).not.toHaveProperty('slackBotToken');
    });
  });

  describe('PUT /api/v1/admin/settings', () => {
    it('should update global settings for admin', async () => {
      const updates = {
        defaultLanguage: 'Spanish',
        defaultStyle: 'ELI5',
        rateLimitPerMinute: 15,
        cacheTTL: 7200,
      };

      const response = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.updated).toBeDefined();
      expect(response.body.updated.defaultLanguage).toBe('Spanish');
      expect(response.body.updated.defaultStyle).toBe('ELI5');
    });

    it('should reject updates with no valid fields', async () => {
      const response = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ invalidField: 'value' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No valid updates');
    });

    it('should reject updates from non-admin users', async () => {
      const response = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ defaultLanguage: 'French' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should list all users with roles for admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(2);

      // Check user structure
      const user = response.body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('slackUserId');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isAdmin');
      expect(user).toHaveProperty('createdAt');
    });

    it('should reject requests from non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/v1/admin/users/:userId', () => {
    it('should update user role and admin status', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.Marketing,
          isAdmin: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.user.role).toBe(UserRole.Marketing);
      expect(response.body.user.isAdmin).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/v1/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.QA });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should reject updates from non-admin users', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ isAdmin: false });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/usage', () => {
    it('should return aggregated usage statistics for admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.totalTranslations).toBeGreaterThanOrEqual(2);
      expect(response.body.usage.totalTokens).toBeGreaterThanOrEqual(350); // 150 + 200
      expect(response.body.usage.activeUsers).toBeGreaterThanOrEqual(2);
    });

    it('should include usage grouped by user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.usage.byUser).toBeDefined();
      expect(Array.isArray(response.body.usage.byUser)).toBe(true);
      expect(response.body.usage.byUser.length).toBeGreaterThanOrEqual(2);

      const userStats = response.body.usage.byUser[0];
      expect(userStats).toHaveProperty('userId');
      expect(userStats).toHaveProperty('slackUserId');
      expect(userStats).toHaveProperty('translationCount');
      expect(userStats).toHaveProperty('totalTokens');
    });

    it('should support date range filtering', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-01T23:59:59.999Z';

      const response = await request(app)
        .get('/api/v1/admin/usage')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should only include translations from Jan 1, 2024
      expect(response.body.usage.totalTranslations).toBe(1);
    });

    it('should reject requests from non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
