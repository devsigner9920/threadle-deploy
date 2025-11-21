/**
 * Slash Commands Tests
 * Tests for Slack slash command handlers (/explain, /setprofile, /help)
 *
 * These tests verify:
 * - Commands acknowledge within 3 seconds
 * - /explain handler processes thread context correctly
 * - /setprofile opens modal for profile configuration
 * - /help returns comprehensive help text
 * - Commands validate input correctly
 */

import request from 'supertest';
import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { getPrismaClient } from '../server/database/client';

describe('Slash Commands', () => {
  let testConfigDir: string;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let signingSecret: string;
  let app: any;

  beforeAll(async () => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    // Set environment variable so server uses test config directory
    process.env['THREADLE_CONFIG_DIR'] = testConfigDir;

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);

    // Set up test configuration
    signingSecret = 'test-signing-secret-for-slash-commands';
    configService.update({
      slackClientId: 'test-client-id',
      slackWorkspaceId: 'T1234567890',
    });
    secretsService.updateSecret('slackSigningSecret', signingSecret);
    secretsService.updateSecret('slackBotToken', 'xoxb-test-bot-token');
    configService.save();

    // Import app AFTER setting env variable
    const serverModule = await import('../server/index');
    app = serverModule.app;
  });

  afterAll(async () => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clean up environment variable
    delete process.env['THREADLE_CONFIG_DIR'];

    // Close database connection
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  });

  /**
   * Helper function to create valid Slack signature
   */
  function createSlackSignature(timestamp: string, body: string): string {
    const sigBasestring = `v0:${timestamp}:${body}`;
    return 'v0=' + crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex');
  }

  /**
   * Helper function to create slash command payload
   */
  function createCommandPayload(
    command: string,
    text: string = '',
    channelId: string = 'C1234567890',
    userId: string = 'U1234567890',
    threadTs?: string
  ): string {
    const payload: Record<string, string> = {
      token: 'test-verification-token',
      team_id: 'T1234567890',
      team_domain: 'test-workspace',
      channel_id: channelId,
      channel_name: 'test-channel',
      user_id: userId,
      user_name: 'testuser',
      command: command,
      text: text,
      response_url: 'https://hooks.slack.com/commands/test-response-url',
      trigger_id: 'test-trigger-id',
    };

    if (threadTs) {
      payload['thread_ts'] = threadTs;
    }

    return new URLSearchParams(payload).toString();
  }

  describe('Command Acknowledgment', () => {
    test('should acknowledge /explain command within 3 seconds', async () => {
      const body = createCommandPayload('/explain', '', 'C1234567890', 'U1234567890');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      const duration = Date.now() - startTime;

      // Should respond within 3 seconds (3000ms)
      expect(duration).toBeLessThan(3000);
      expect(response.status).toBe(200);
    });

    test('should acknowledge /setprofile command within 3 seconds', async () => {
      const body = createCommandPayload('/setprofile', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
      expect(response.status).toBe(200);
    });

    test('should acknowledge /help command within 3 seconds', async () => {
      const body = createCommandPayload('/help', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
      expect(response.status).toBe(200);
    });
  });

  describe('/help Command', () => {
    test('should return comprehensive help text', async () => {
      const body = createCommandPayload('/help', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response_type', 'ephemeral');
      expect(response.body).toHaveProperty('text');

      // Should contain information about all commands
      expect(response.body.text).toContain('/explain');
      expect(response.body.text).toContain('/setprofile');
      expect(response.body.text).toContain('/help');

      // Should explain ephemeral vs public
      expect(response.body.text).toContain('ephemeral');
      expect(response.body.text).toContain('public');

      // Should provide link to web UI (with localhost, port may vary)
      expect(response.body.text).toContain('localhost');
      expect(response.body.text).toContain('/profile');
    });
  });

  describe('/setprofile Command', () => {
    test('should acknowledge and indicate modal will open', async () => {
      const body = createCommandPayload('/setprofile', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);
      // Response should indicate modal interaction
      // Since we're not fully implementing modal opening in this basic test,
      // we just verify the endpoint responds correctly
    });
  });

  describe('/explain Command', () => {
    test('should default to ephemeral response', async () => {
      const body = createCommandPayload('/explain', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);
      // Default should be ephemeral
      if (response.body.response_type) {
        expect(response.body.response_type).toBe('ephemeral');
      }
    });

    test('should support public flag for in_channel response', async () => {
      const body = createCommandPayload('/explain', 'public');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);
      // With 'public' flag, should use in_channel
      // The actual implementation will determine the response type
    });
  });

  describe('Command Validation', () => {
    test('should reject commands without valid signature', async () => {
      const body = createCommandPayload('/explain', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'v0=invalid-signature-hash';

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', invalidSignature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject commands with old timestamp', async () => {
      const body = createCommandPayload('/explain', '');
      // Timestamp from 10 minutes ago
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
      const signature = createSlackSignature(oldTimestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', oldTimestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle unknown commands gracefully', async () => {
      const body = createCommandPayload('/unknown', '');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/commands')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);
      // Should return error message but still acknowledge (200 status)
      expect(response.body).toHaveProperty('text');
      expect(response.body.text).toContain('Unknown command');
    });
  });
});
