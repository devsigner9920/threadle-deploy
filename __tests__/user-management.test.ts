/**
 * User Management Tests
 * Tests for UserService, role inference, and profile API endpoints
 */

import { getPrismaClient } from '../server/database/client.js';
import { UserService } from '../server/user/UserService.js';
import { ConfigService, SecretsService } from '../server/config/index.js';
import { SlackClient } from '../server/slack/slackClient.js';
import { UserRole, Language } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock Slack client
jest.mock('../server/slack/slackClient.js');

const prisma = getPrismaClient();

describe('User Management', () => {
  let userService: UserService;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let mockSlackClient: jest.Mocked<SlackClient>;

  beforeAll(async () => {
    // Clean up database before tests
    await prisma.userFeedback.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();

    // Initialize services
    configService = new ConfigService();
    secretsService = new SecretsService();
    configService.load();

    // Create mock Slack client
    mockSlackClient = {
      getUser: jest.fn(),
      getChannel: jest.fn(),
      postMessage: jest.fn(),
      postEphemeral: jest.fn(),
      getThreadMessages: jest.fn(),
    } as any;

    userService = new UserService(mockSlackClient);
  });

  afterAll(async () => {
    // Clean up
    await prisma.userFeedback.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('UserService - User Creation', () => {
    it('should create a new user with Slack ID', async () => {
      const userData = {
        slackUserId: 'U123456',
        slackWorkspaceId: 'T123456',
        role: UserRole.Engineering_Backend,
        language: Language.English,
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.slackUserId).toBe('U123456');
      expect(user.slackWorkspaceId).toBe('T123456');
      expect(user.role).toBe(UserRole.Engineering_Backend);
      expect(user.language).toBe(Language.English);
      expect(user.isAdmin).toBe(false);
    });

    it('should create admin user when isAdmin is true', async () => {
      const userData = {
        slackUserId: 'U_ADMIN',
        slackWorkspaceId: 'T123456',
        role: UserRole.Product,
        language: Language.English,
        isAdmin: true,
      };

      const user = await userService.createUser(userData);

      expect(user.isAdmin).toBe(true);
    });
  });

  describe('UserService - User Retrieval', () => {
    beforeAll(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          slackUserId: 'U_RETRIEVE',
          slackWorkspaceId: 'T123456',
          role: UserRole.Design,
          language: Language.Spanish,
        },
      });
    });

    it('should get user by Slack ID', async () => {
      const user = await userService.getUserBySlackId('U_RETRIEVE');

      expect(user).toBeDefined();
      expect(user?.slackUserId).toBe('U_RETRIEVE');
      expect(user?.role).toBe(UserRole.Design);
    });

    it('should return null for non-existent Slack ID', async () => {
      const user = await userService.getUserBySlackId('U_NONEXISTENT');

      expect(user).toBeNull();
    });

    it('should get user by database ID', async () => {
      const existingUser = await prisma.user.findUnique({
        where: { slackUserId: 'U_RETRIEVE' },
      });

      const user = await userService.getUserById(existingUser!.id);

      expect(user).toBeDefined();
      expect(user?.id).toBe(existingUser!.id);
    });
  });

  describe('UserService - User Update', () => {
    let testUserId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U_UPDATE',
          slackWorkspaceId: 'T123456',
          role: UserRole.Engineering_Frontend,
          language: Language.English,
        },
      });
      testUserId = user.id;
    });

    it('should update user profile', async () => {
      const updates = {
        role: UserRole.Marketing,
        preferredStyle: 'ELI5',
        customInstructions: 'Keep it simple',
      };

      const updated = await userService.updateUser(testUserId, updates);

      expect(updated.role).toBe(UserRole.Marketing);
      expect(updated.preferredStyle).toBe('ELI5');
      expect(updated.customInstructions).toBe('Keep it simple');
    });

    it('should throw error when updating non-existent user', async () => {
      await expect(
        userService.updateUser('non-existent-id', { role: UserRole.QA })
      ).rejects.toThrow('User not found');
    });
  });

  describe('UserService - Admin Management', () => {
    let regularUserId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U_REGULAR',
          slackWorkspaceId: 'T123456',
          role: UserRole.QA,
          language: Language.English,
          isAdmin: false,
        },
      });
      regularUserId = user.id;
    });

    it('should set user as admin', async () => {
      const updated = await userService.setAdmin(regularUserId, true);

      expect(updated.isAdmin).toBe(true);
    });

    it('should remove admin privileges', async () => {
      const updated = await userService.setAdmin(regularUserId, false);

      expect(updated.isAdmin).toBe(false);
    });
  });

  describe('Auto-role Inference from Slack Profile', () => {
    it('should infer Engineering-Backend role from title', async () => {
      mockSlackClient.getUser.mockResolvedValue({
        id: 'U_BACKEND',
        name: 'backend-dev',
        profile: {
          title: 'Senior Backend Engineer',
          email: 'backend@example.com',
        },
      });

      const role = await userService.inferRoleFromSlack('U_BACKEND');

      expect(role).toBe(UserRole.Engineering_Backend);
    });

    it('should infer Engineering-Frontend role from title', async () => {
      mockSlackClient.getUser.mockResolvedValue({
        id: 'U_FRONTEND',
        name: 'frontend-dev',
        profile: {
          title: 'Frontend Developer',
        },
      });

      const role = await userService.inferRoleFromSlack('U_FRONTEND');

      expect(role).toBe(UserRole.Engineering_Frontend);
    });

    it('should infer Design role from title', async () => {
      mockSlackClient.getUser.mockResolvedValue({
        id: 'U_DESIGNER',
        name: 'designer',
        profile: {
          title: 'UX Designer',
        },
      });

      const role = await userService.inferRoleFromSlack('U_DESIGNER');

      expect(role).toBe(UserRole.Design);
    });

    it('should infer Product role from title', async () => {
      mockSlackClient.getUser.mockResolvedValue({
        id: 'U_PM',
        name: 'pm',
        profile: {
          title: 'Product Manager',
        },
      });

      const role = await userService.inferRoleFromSlack('U_PM');

      expect(role).toBe(UserRole.Product);
    });

    it('should default to Engineering-Backend when role cannot be inferred', async () => {
      mockSlackClient.getUser.mockResolvedValue({
        id: 'U_UNKNOWN',
        name: 'unknown',
        profile: {
          title: 'Some Random Title',
        },
      });

      const role = await userService.inferRoleFromSlack('U_UNKNOWN');

      expect(role).toBe(UserRole.Engineering_Backend);
    });
  });

  describe('JWT Authentication', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        slackUserId: 'U123456',
        isAdmin: false,
      };

      const secret = configService.get('jwtSecret') || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token
      const decoded = jwt.verify(token, secret) as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.slackUserId).toBe('U123456');
      expect(decoded.isAdmin).toBe(false);
    });

    it('should include admin flag in JWT', () => {
      const payload = {
        userId: 'admin-123',
        slackUserId: 'U_ADMIN',
        isAdmin: true,
      };

      const secret = configService.get('jwtSecret') || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      const decoded = jwt.verify(token, secret) as any;
      expect(decoded.isAdmin).toBe(true);
    });
  });
});
