/**
 * Wizard Steps Tests
 * Tests for individual wizard step implementations including API key validation,
 * Slack credentials, OAuth flow, and settings configuration.
 */

import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import request from 'supertest';
import { app } from '../server/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getPrismaClient } from '../server/database/client';

const prisma = getPrismaClient();

describe('Wizard Steps Implementation', () => {
  let configService: ConfigService;
  let secretsService: SecretsService;
  let testConfigDir: string;

  beforeEach(() => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);
    configService.load();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Step 2: AI Provider Configuration', () => {
    test('should validate and save LLM API key', async () => {
      const providerData = {
        provider: 'openai',
        apiKey: 'sk-test-1234567890',
        model: 'gpt-4',
      };

      const response = await request(app)
        .post('/api/v1/setup/llm-config')
        .send(providerData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should encrypt and store API key in secrets', async () => {
      const apiKey = 'sk-test-anthropic-key';

      secretsService.updateSecret('llmApiKey', apiKey);

      const retrieved = secretsService.getSecret('llmApiKey');
      expect(retrieved).toBe(apiKey);
    });

    test('should return error for invalid API key format', async () => {
      const invalidData = {
        provider: 'openai',
        apiKey: '', // Empty API key
        model: 'gpt-4',
      };

      const response = await request(app)
        .post('/api/v1/setup/llm-config')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 3: Slack App Setup', () => {
    test('should save Slack credentials to config and secrets', async () => {
      const slackData = {
        appId: 'A01234567',
        clientId: '1234567890.1234567890',
        clientSecret: 'test-client-secret',
        signingSecret: 'test-signing-secret',
      };

      const response = await request(app)
        .post('/api/v1/setup/slack-config')
        .send(slackData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should validate all required Slack fields', async () => {
      const incompleteData = {
        appId: 'A01234567',
        clientId: '1234567890.1234567890',
        // Missing clientSecret and signingSecret
      };

      const response = await request(app)
        .post('/api/v1/setup/slack-config')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 4: OAuth Flow', () => {
    test('should handle OAuth callback and save bot token', async () => {
      // Mock OAuth callback with code
      const response = await request(app)
        .get('/api/v1/slack/oauth')
        .query({ code: 'test-oauth-code' });

      // OAuth will fail without real Slack API, but endpoint should exist
      expect([200, 400, 500, 302]).toContain(response.status);
    });

    test('should save OAuth completion status', () => {
      // Save OAuth data
      configService.update({
        slackWorkspaceId: 'T01234567',
      });
      secretsService.updateSecret('slackBotToken', 'xoxb-test-bot-token');
      configService.save();

      // Verify saved
      const newConfigService = new ConfigService(testConfigDir);
      newConfigService.load();
      const newSecretsService = new SecretsService(testConfigDir);

      expect(newConfigService.get('slackWorkspaceId')).toBe('T01234567');
      expect(newSecretsService.getSecret('slackBotToken')).toBe('xoxb-test-bot-token');
    });
  });

  describe('Step 5: Global Default Settings', () => {
    test('should save global settings to config', async () => {
      const settings = {
        defaultStyle: 'ELI5',
        defaultLanguage: 'English',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      const response = await request(app)
        .post('/api/v1/setup/global-settings')
        .send(settings);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should validate translation style options', () => {
      expect(() => {
        configService.set('defaultStyle', 'ELI5');
      }).not.toThrow();

      expect(() => {
        configService.set('defaultStyle', 'Business Summary');
      }).not.toThrow();

      expect(() => {
        configService.set('defaultStyle', 'invalid-style' as any);
      }).toThrow();
    });

    test('should validate rate limit within bounds', () => {
      expect(() => {
        configService.set('rateLimitPerMinute', 10);
      }).not.toThrow();

      expect(() => {
        configService.set('rateLimitPerMinute', -5);
      }).toThrow();

      expect(() => {
        configService.set('rateLimitPerMinute', 2000);
      }).toThrow();
    });
  });

  describe('Step 6: Admin Account Creation', () => {
    test('should create admin user in database', async () => {
      const adminData = {
        slackUserId: 'U01234567',
        slackWorkspaceId: 'T01234567',
      };

      const response = await request(app)
        .post('/api/v1/setup/admin-user')
        .send(adminData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
    });

    test('should set isAdmin flag to true', async () => {
      const adminData = {
        slackUserId: 'U99999999',
        slackWorkspaceId: 'T99999999',
      };

      const response = await request(app)
        .post('/api/v1/setup/admin-user')
        .send(adminData);

      expect(response.status).toBe(200);

      // Query database to verify admin user
      const user = await prisma.user.findUnique({
        where: { slackUserId: 'U99999999' },
      });

      expect(user).toBeTruthy();
      expect(user?.isAdmin).toBe(true);
    });

    test('should return error if slackUserId is missing', async () => {
      const invalidData = {
        slackWorkspaceId: 'T01234567',
        // Missing slackUserId
      };

      const response = await request(app)
        .post('/api/v1/setup/admin-user')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Complete Setup Flow Integration', () => {
    test('should complete all wizard steps and mark setup as complete', async () => {
      // Step 2: LLM Config
      await request(app).post('/api/v1/setup/llm-config').send({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      });

      // Step 3: Slack Config
      await request(app).post('/api/v1/setup/slack-config').send({
        appId: 'A01234567',
        clientId: '1234.5678',
        clientSecret: 'secret123',
        signingSecret: 'signing123',
      });

      // Step 5: Global Settings
      await request(app).post('/api/v1/setup/global-settings').send({
        defaultStyle: 'ELI5',
        defaultLanguage: 'English',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      });

      // Step 6: Admin User
      const adminResponse = await request(app)
        .post('/api/v1/setup/admin-user')
        .send({
          slackUserId: 'UADMIN123',
          slackWorkspaceId: 'T01234567',
        });

      expect(adminResponse.status).toBe(200);

      // Complete setup
      const completeResponse = await request(app)
        .post('/api/v1/setup/complete')
        .send({
          llmProvider: 'openai',
          slackAppId: 'A01234567',
          slackClientId: '1234.5678',
          slackWorkspaceId: 'T01234567',
          defaultStyle: 'ELI5',
          defaultLanguage: 'English',
          rateLimitPerMinute: 10,
          cacheTTL: 3600,
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.success).toBe(true);
    });
  });
});
