/**
 * Slack Event Handlers Tests
 * Tests for Slack event subscriptions and interactive components
 *
 * These tests verify:
 * - Message events update conversation metadata
 * - app_mention triggers helpful response
 * - Event deduplication prevents duplicates
 * - URL verification challenge succeeds
 * - Interactive components (buttons) work correctly
 */

import request from 'supertest';
import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

describe('Slack Event Handlers', () => {
  let testConfigDir: string;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let signingSecret: string;
  let app: any;
  let prisma: PrismaClient;
  let testDbPath: string;

  beforeAll(async () => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-events-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    // Create test database path
    testDbPath = path.join(testConfigDir, 'test.db');
    const testDbUrl = `file:${testDbPath}`;
    process.env['DATABASE_URL'] = testDbUrl;

    // Set environment variable so server uses test config directory
    process.env['THREADLE_CONFIG_DIR'] = testConfigDir;

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);

    // Set up test configuration
    signingSecret = 'test-signing-secret-for-events';
    configService.update({
      slackClientId: 'test-client-id',
      slackWorkspaceId: 'T1234567890',
    });
    secretsService.updateSecret('slackSigningSecret', signingSecret);
    secretsService.updateSecret('slackBotToken', 'xoxb-test-bot-token');
    configService.save();

    // Initialize Prisma client with test database
    const adapter = new PrismaLibSql({ url: testDbUrl });
    prisma = new PrismaClient({ adapter });

    // Run migrations to set up schema
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDbUrl },
    });

    // Import app AFTER setting env variable
    const serverModule = await import('../server/index');
    app = serverModule.app;
  });

  afterAll(async () => {
    // Close database connection
    await prisma.$disconnect();

    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clean up environment variables
    delete process.env['THREADLE_CONFIG_DIR'];
    delete process.env['DATABASE_URL'];
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.userFeedback.deleteMany({});
    await prisma.translation.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({});
  });

  /**
   * Helper function to create valid Slack signature
   */
  function createSlackSignature(timestamp: string, body: string): string {
    const sigBasestring = `v0:${timestamp}:${body}`;
    return (
      'v0=' +
      crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex')
    );
  }

  describe('URL Verification Challenge', () => {
    test('should respond to URL verification challenge on first setup', async () => {
      const challenge = 'test-challenge-string-12345';
      const body = JSON.stringify({
        type: 'url_verification',
        challenge: challenge,
        token: 'verification-token',
      });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('challenge', challenge);
    });
  });

  describe('Message Events', () => {
    test('should update conversation metadata when message event received', async () => {
      const eventPayload = {
        type: 'event_callback',
        event_id: 'Ev12345678',
        event_time: Math.floor(Date.now() / 1000),
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hello, this is a test message',
          ts: '1234567890.123456',
          thread_ts: '1234567890.123456',
        },
      };

      const body = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(body);

      // Should acknowledge within 3 seconds
      expect(response.status).toBe(200);

      // Give background processing a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify conversation was created/updated in database
      const conversation = await prisma.conversation.findFirst({
        where: {
          slackChannelId: 'C1234567890',
          slackThreadTs: '1234567890.123456',
        },
      });

      expect(conversation).toBeTruthy();
      expect(conversation?.messageCount).toBe(1);
    });

    test('should skip bot messages to prevent loops', async () => {
      const eventPayload = {
        type: 'event_callback',
        event_id: 'Ev12345679',
        event_time: Math.floor(Date.now() / 1000),
        event: {
          type: 'message',
          channel: 'C1234567890',
          bot_id: 'B1234567890', // This is a bot message
          text: 'This is a bot message',
          ts: '1234567890.123457',
          thread_ts: '1234567890.123457',
        },
      };

      const body = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response.status).toBe(200);

      // Give background processing a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify conversation was NOT created (bot messages should be skipped)
      const conversation = await prisma.conversation.findFirst({
        where: {
          slackChannelId: 'C1234567890',
          slackThreadTs: '1234567890.123457',
        },
      });

      expect(conversation).toBeNull();
    });
  });

  describe('App Mention Events', () => {
    test('should trigger helpful response when bot is @mentioned', async () => {
      const eventPayload = {
        type: 'event_callback',
        event_id: 'Ev12345680',
        event_time: Math.floor(Date.now() / 1000),
        event: {
          type: 'app_mention',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: '<@U0BOTUSER> can you help me understand this?',
          ts: '1234567890.123458',
        },
      };

      const body = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(body);

      // Should acknowledge within 3 seconds
      expect(response.status).toBe(200);

      // Note: We can't easily test the actual Slack API call in unit tests
      // but we verify the endpoint processes the event correctly
    });
  });

  describe('Event Deduplication', () => {
    test('should prevent duplicate event processing', async () => {
      const eventPayload = {
        type: 'event_callback',
        event_id: 'Ev12345681', // Same event_id will be sent twice
        event_time: Math.floor(Date.now() / 1000),
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Duplicate test message',
          ts: '1234567890.123459',
          thread_ts: '1234567890.123459',
        },
      };

      const body = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      // Send first event
      const response1 = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response1.status).toBe(200);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send duplicate event with same event_id
      const timestamp2 = Math.floor(Date.now() / 1000).toString();
      const signature2 = createSlackSignature(timestamp2, body);

      const response2 = await request(app)
        .post('/api/v1/slack/events')
        .set('x-slack-signature', signature2)
        .set('x-slack-request-timestamp', timestamp2)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response2.status).toBe(200);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify only one conversation was created
      const conversations = await prisma.conversation.findMany({
        where: {
          slackChannelId: 'C1234567890',
          slackThreadTs: '1234567890.123459',
        },
      });

      expect(conversations.length).toBe(1);
      if (conversations[0]) {
        expect(conversations[0].messageCount).toBe(1); // Should only count once
      }
    });
  });

  describe('Interactive Components', () => {
    test('should handle feedback button clicks', async () => {
      // First create a user and translation for the feedback
      const user = await prisma.user.create({
        data: {
          slackUserId: 'U1234567890',
          slackWorkspaceId: 'T1234567890',
          role: 'Engineering_Backend',
          language: 'English',
        },
      });

      const conversation = await prisma.conversation.create({
        data: {
          slackChannelId: 'C1234567890',
          slackThreadTs: '1234567890.123456',
          messageCount: 5,
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      const translation = await prisma.translation.create({
        data: {
          conversationId: conversation.id,
          requestedByUserId: user.id,
          originalMessages: JSON.stringify([{ text: 'test' }]),
          translatedContent: 'Test translation',
          targetRole: 'Engineering_Backend',
          language: 'English',
          llmProvider: 'openai',
          tokenUsage: 100,
        },
      });

      // Create interactive payload for thumbs up
      const payload = {
        type: 'block_actions',
        user: {
          id: 'U1234567890',
        },
        actions: [
          {
            action_id: 'feedback_thumbs_up',
            block_id: 'feedback_block',
            value: translation.id,
          },
        ],
        response_url: 'https://hooks.slack.com/actions/test',
      };

      const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSlackSignature(timestamp, body);

      const response = await request(app)
        .post('/api/v1/slack/interactivity')
        .set('x-slack-signature', signature)
        .set('x-slack-request-timestamp', timestamp)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify feedback was saved to database
      const feedback = await prisma.userFeedback.findFirst({
        where: {
          translationId: translation.id,
          userId: user.id,
        },
      });

      expect(feedback).toBeTruthy();
      expect(feedback?.rating).toBe('thumbs_up');
    });
  });
});
