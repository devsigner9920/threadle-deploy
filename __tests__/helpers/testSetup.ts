/**
 * Test Setup Helpers
 * Utilities for setting up test databases, mock data, and test environments
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { ConfigService } from '../../server/config/ConfigService.js';
import { SecretsService } from '../../server/config/SecretsService.js';
import { setPrismaClient } from '../../server/database/client.js';

export interface TestContext {
  prisma: PrismaClient;
  configService: ConfigService;
  secretsService: SecretsService;
  testConfigDir: string;
  testDbPath: string;
  signingSecret: string;
  cleanupFn: () => Promise<void>;
}

/**
 * Create a test environment with isolated database and config
 */
export async function createTestEnvironment(testName: string): Promise<TestContext> {
  // Create temporary config directory
  const testConfigDir = path.join(os.tmpdir(), `.threadle-test-${testName}-${Date.now()}`);
  fs.mkdirSync(testConfigDir, { recursive: true });

  // Create test database path
  const testDbPath = path.join(testConfigDir, 'test.db');
  const testDbUrl = `file:${testDbPath}`;

  // Set environment variables
  process.env['DATABASE_URL'] = testDbUrl;
  process.env['THREADLE_CONFIG_DIR'] = testConfigDir;

  // Initialize services
  const configService = new ConfigService(testConfigDir);
  const secretsService = new SecretsService(testConfigDir);

  // Set up test configuration
  const signingSecret = `test-signing-secret-${testName}`;
  configService.update({
    slackClientId: 'test-client-id',
    slackWorkspaceId: 'T1234567890',
    setupCompleted: true,
    port: 3000,
    llmProvider: 'openai',
    defaultLanguage: 'English',
    defaultStyle: 'ELI5',
    rateLimitPerMinute: 10,
    cacheTTL: 3600,
  });

  secretsService.updateSecret('slackSigningSecret', signingSecret);
  secretsService.updateSecret('slackBotToken', 'xoxb-test-bot-token');
  secretsService.updateSecret('llmApiKey', 'test-llm-api-key');
  configService.save();

  // Initialize Prisma client
  const adapter = new PrismaLibSql({ url: testDbUrl });
  const prisma = new PrismaClient({ adapter });

  // Set as global client
  setPrismaClient(prisma);

  // Run migrations
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: testDbUrl },
  });

  // Cleanup function
  const cleanupFn = async () => {
    await prisma.$disconnect();

    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    delete process.env['THREADLE_CONFIG_DIR'];
    delete process.env['DATABASE_URL'];
  };

  return {
    prisma,
    configService,
    secretsService,
    testConfigDir,
    testDbPath,
    signingSecret,
    cleanupFn,
  };
}

/**
 * Create a valid Slack signature for testing
 */
export function createSlackSignature(signingSecret: string, timestamp: string, body: string): string {
  const sigBasestring = `v0:${timestamp}:${body}`;
  return 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');
}

/**
 * Clean up all test data from database
 */
export async function cleanupDatabase(prisma: PrismaClient) {
  await prisma.userFeedback.deleteMany();
  await prisma.translation.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
}
