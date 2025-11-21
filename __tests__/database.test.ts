import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Database Tests (Task Group 2)', () => {
  let prisma: PrismaClient;
  const testDbPath = path.join(__dirname, '../data/test.db');

  beforeAll(async () => {
    // Set up test database URL
    const testDbUrl = `file:${testDbPath}`;
    process.env['DATABASE_URL'] = testDbUrl;

    // Create adapter with URL configuration
    const adapter = new PrismaLibSql({ url: testDbUrl });

    // Initialize Prisma client with adapter
    prisma = new PrismaClient({ adapter });

    // Run migrations programmatically
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDbUrl }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();

    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clean up WAL files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('2.1.1 - User model creation and validation', () => {
    test('should create a user with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U123456',
          slackWorkspaceId: 'T123456',
          role: 'Engineering_Backend',
          language: 'English',
          isAdmin: false,
        },
      });

      expect(user.id).toBeDefined();
      expect(user.slackUserId).toBe('U123456');
      expect(user.slackWorkspaceId).toBe('T123456');
      expect(user.role).toBe('Engineering_Backend');
      expect(user.language).toBe('English');
      expect(user.isAdmin).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    test('should enforce unique constraint on slackUserId', async () => {
      await prisma.user.create({
        data: {
          slackUserId: 'U999999',
          slackWorkspaceId: 'T123456',
          role: 'Design',
          language: 'English',
          isAdmin: false,
        },
      });

      // Attempting to create duplicate should fail
      await expect(
        prisma.user.create({
          data: {
            slackUserId: 'U999999',
            slackWorkspaceId: 'T123456',
            role: 'Product',
            language: 'English',
            isAdmin: false,
          },
        })
      ).rejects.toThrow();
    });

    test('should support all role enum values', async () => {
      const roles = [
        'Engineering_Backend',
        'Engineering_Frontend',
        'Engineering_Mobile',
        'Design',
        'Product',
        'Marketing',
        'QA',
        'Data',
      ];

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const user = await prisma.user.create({
          data: {
            slackUserId: `U${i}${i}${i}${i}${i}`,
            slackWorkspaceId: 'T123456',
            role: role as any,
            language: 'English',
            isAdmin: false,
          },
        });
        expect(user.role).toBe(role);
      }
    });

    test('should support optional fields', async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U888888',
          slackWorkspaceId: 'T123456',
          role: 'Engineering_Frontend',
          language: 'Spanish',
          customInstructions: 'Please use simple terms',
          preferredStyle: 'ELI5',
          isAdmin: true,
        },
      });

      expect(user.customInstructions).toBe('Please use simple terms');
      expect(user.preferredStyle).toBe('ELI5');
      expect(user.isAdmin).toBe(true);
    });
  });

  describe('2.1.2 - Conversation model associations', () => {
    test('should create conversation with required fields', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          slackChannelId: 'C123456',
          slackThreadTs: '1234567890.123456',
          messageCount: 5,
          firstMessageAt: new Date('2024-01-01'),
          lastMessageAt: new Date('2024-01-02'),
        },
      });

      expect(conversation.id).toBeDefined();
      expect(conversation.slackChannelId).toBe('C123456');
      expect(conversation.slackThreadTs).toBe('1234567890.123456');
      expect(conversation.messageCount).toBe(5);
    });

    test('should enforce unique constraint on slackChannelId and slackThreadTs', async () => {
      await prisma.conversation.create({
        data: {
          slackChannelId: 'C999999',
          slackThreadTs: '9999999999.999999',
          messageCount: 1,
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      // Attempting to create duplicate should fail
      await expect(
        prisma.conversation.create({
          data: {
            slackChannelId: 'C999999',
            slackThreadTs: '9999999999.999999',
            messageCount: 2,
            firstMessageAt: new Date(),
            lastMessageAt: new Date(),
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('2.1.3 - Translation model stores data correctly', () => {
    test('should create translation with relationships', async () => {
      // Create user first
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U777777',
          slackWorkspaceId: 'T123456',
          role: 'Product',
          language: 'English',
          isAdmin: false,
        },
      });

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          slackChannelId: 'C777777',
          slackThreadTs: '7777777777.777777',
          messageCount: 3,
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      // Create translation (originalMessages must be JSON stringified)
      const translation = await prisma.translation.create({
        data: {
          conversationId: conversation.id,
          requestedByUserId: user.id,
          originalMessages: JSON.stringify({ messages: ['Hello', 'World'] }),
          translatedContent: 'Simplified explanation',
          targetRole: 'Product',
          language: 'English',
          llmProvider: 'openai',
          tokenUsage: 150,
        },
      });

      expect(translation.id).toBeDefined();
      expect(translation.conversationId).toBe(conversation.id);
      expect(translation.requestedByUserId).toBe(user.id);
      expect(JSON.parse(translation.originalMessages)).toEqual({ messages: ['Hello', 'World'] });
      expect(translation.translatedContent).toBe('Simplified explanation');
      expect(translation.tokenUsage).toBe(150);
      expect(translation.createdAt).toBeDefined();
    });

    test('should support querying translations with relations', async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U666666',
          slackWorkspaceId: 'T123456',
          role: 'Design',
          language: 'English',
          isAdmin: false,
        },
      });

      const conversation = await prisma.conversation.create({
        data: {
          slackChannelId: 'C666666',
          slackThreadTs: '6666666666.666666',
          messageCount: 2,
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      await prisma.translation.create({
        data: {
          conversationId: conversation.id,
          requestedByUserId: user.id,
          originalMessages: JSON.stringify({ text: 'test' }),
          translatedContent: 'test translation',
          targetRole: 'Design',
          language: 'English',
          llmProvider: 'anthropic',
          tokenUsage: 100,
        },
      });

      const translations = await prisma.translation.findMany({
        where: { requestedByUserId: user.id },
        include: {
          conversation: true,
          requestedByUser: true,
        },
      });

      expect(translations.length).toBeGreaterThan(0);
      expect(translations[0]?.conversation).toBeDefined();
      expect(translations[0]?.requestedByUser).toBeDefined();
    });
  });

  describe('2.1.4 - UserFeedback model works correctly', () => {
    test('should create user feedback for translation', async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U555555',
          slackWorkspaceId: 'T123456',
          role: 'Marketing',
          language: 'English',
          isAdmin: false,
        },
      });

      const conversation = await prisma.conversation.create({
        data: {
          slackChannelId: 'C555555',
          slackThreadTs: '5555555555.555555',
          messageCount: 1,
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      const translation = await prisma.translation.create({
        data: {
          conversationId: conversation.id,
          requestedByUserId: user.id,
          originalMessages: JSON.stringify({ msg: 'test' }),
          translatedContent: 'test',
          targetRole: 'Marketing',
          language: 'English',
          llmProvider: 'openai',
          tokenUsage: 50,
        },
      });

      const feedback = await prisma.userFeedback.create({
        data: {
          translationId: translation.id,
          userId: user.id,
          rating: 'thumbs_up',
          comment: 'Very helpful!',
        },
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.rating).toBe('thumbs_up');
      expect(feedback.comment).toBe('Very helpful!');
      expect(feedback.createdAt).toBeDefined();
    });
  });

  describe('2.1.5 - Settings model (key-value store)', () => {
    test('should create and retrieve settings', async () => {
      const setting = await prisma.settings.create({
        data: {
          key: 'llmProvider',
          value: 'openai',
        },
      });

      expect(setting.id).toBeDefined();
      expect(setting.key).toBe('llmProvider');
      expect(setting.value).toBe('openai');
      expect(setting.updatedAt).toBeDefined();
    });

    test('should enforce unique constraint on key', async () => {
      await prisma.settings.create({
        data: {
          key: 'defaultLanguage',
          value: 'English',
        },
      });

      // Attempting to create duplicate key should fail
      await expect(
        prisma.settings.create({
          data: {
            key: 'defaultLanguage',
            value: 'Spanish',
          },
        })
      ).rejects.toThrow();
    });

    test('should update existing setting', async () => {
      const setting = await prisma.settings.create({
        data: {
          key: 'cacheTTL',
          value: '3600',
        },
      });

      const updated = await prisma.settings.update({
        where: { key: 'cacheTTL' },
        data: { value: '7200' },
      });

      expect(updated.value).toBe('7200');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(setting.updatedAt.getTime());
    });
  });

  describe('2.1.6 - Database migrations', () => {
    test('should verify all tables exist', async () => {
      // Query the SQLite schema to verify tables
      const tables = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'
      `;

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('User');
      expect(tableNames).toContain('Conversation');
      expect(tableNames).toContain('Translation');
      expect(tableNames).toContain('UserFeedback');
      expect(tableNames).toContain('Settings');
    });

    test('should have proper indexes on User model', async () => {
      const indexes = await prisma.$queryRaw<Array<{ name: string; sql: string }>>`
        SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='User'
      `;

      const indexNames = indexes.map(i => i.name);

      // Check for slackUserId index (unique)
      const hasSlackUserIdIndex = indexNames.some(name =>
        name.includes('slackUserId') || name.includes('User_slackUserId')
      );

      expect(hasSlackUserIdIndex).toBe(true);
    });
  });
});
