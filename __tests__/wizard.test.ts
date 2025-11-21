/**
 * Setup Wizard Tests
 * Tests for the setup wizard framework including first-time detection,
 * navigation, state management, and completion logic.
 */

import { ConfigService } from '../server/config/ConfigService';
import request from 'supertest';
import { app } from '../server/index';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Setup Wizard Framework', () => {
  let configService: ConfigService;
  let testConfigDir: string;

  beforeEach(() => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    configService = new ConfigService(testConfigDir);
    configService.load();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('First-time Setup Detection', () => {
    test('should detect first-time setup when setupCompleted is false', () => {
      expect(configService.isFirstTimeSetup()).toBe(true);
      expect(configService.get('setupCompleted')).toBe(false);
    });

    test('should not detect first-time setup when setupCompleted is true', () => {
      configService.set('setupCompleted', true);
      configService.save();

      // Create new instance to load from disk
      const newConfigService = new ConfigService(testConfigDir);
      newConfigService.load();

      expect(newConfigService.isFirstTimeSetup()).toBe(false);
      expect(newConfigService.get('setupCompleted')).toBe(true);
    });

    test('should return first-time setup status via API endpoint', async () => {
      const response = await request(app).get('/config/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isFirstTimeSetup');
      expect(response.body).toHaveProperty('setupCompleted');
      expect(typeof response.body.isFirstTimeSetup).toBe('boolean');
    });
  });

  describe('Wizard Configuration Saving', () => {
    test('should save wizard configuration data', () => {
      configService.set('llmProvider', 'openai');
      configService.set('slackAppId', 'A01234567');
      configService.set('slackClientId', 'test-client-id');
      configService.set('defaultLanguage', 'English');
      configService.set('defaultStyle', 'ELI5');
      configService.save();

      // Verify data was saved by loading in new instance
      const newConfigService = new ConfigService(testConfigDir);
      newConfigService.load();

      expect(newConfigService.get('llmProvider')).toBe('openai');
      expect(newConfigService.get('slackAppId')).toBe('A01234567');
      expect(newConfigService.get('slackClientId')).toBe('test-client-id');
      expect(newConfigService.get('defaultLanguage')).toBe('English');
      expect(newConfigService.get('defaultStyle')).toBe('ELI5');
    });

    test('should persist wizard progress to configuration file', () => {
      const configPath = path.join(testConfigDir, 'config.json');

      configService.set('llmProvider', 'anthropic');
      configService.save();

      expect(fs.existsSync(configPath)).toBe(true);

      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(fileContent);

      expect(parsedConfig.llmProvider).toBe('anthropic');
    });
  });

  describe('Wizard Completion', () => {
    test('should mark setup as completed', () => {
      expect(configService.isFirstTimeSetup()).toBe(true);

      configService.completeSetup();

      expect(configService.isFirstTimeSetup()).toBe(false);
      expect(configService.get('setupCompleted')).toBe(true);
    });

    test('should persist setupCompleted flag to disk', () => {
      configService.completeSetup();

      // Verify by loading in new instance
      const newConfigService = new ConfigService(testConfigDir);
      newConfigService.load();

      expect(newConfigService.get('setupCompleted')).toBe(true);
      expect(newConfigService.isFirstTimeSetup()).toBe(false);
    });

    test('should complete setup via API endpoint with full configuration', async () => {
      const setupData = {
        llmProvider: 'openai',
        slackAppId: 'A12345678',
        slackClientId: 'client-id-123',
        slackWorkspaceId: 'T12345678',
        defaultStyle: 'ELI5',
        defaultLanguage: 'English',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      const response = await request(app)
        .post('/api/v1/setup/complete')
        .send(setupData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should mark setup completed after API call', async () => {
      // Use the default config directory for this test
      const setupData = {
        llmProvider: 'anthropic',
        slackAppId: 'A99999999',
        slackClientId: 'client-test',
        slackWorkspaceId: 'T99999999',
        defaultStyle: 'Business Summary',
        defaultLanguage: 'English',
        rateLimitPerMinute: 15,
        cacheTTL: 7200,
      };

      const response = await request(app)
        .post('/api/v1/setup/complete')
        .send(setupData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Wizard State Validation', () => {
    test('should validate LLM provider values', () => {
      expect(() => {
        configService.set('llmProvider', 'openai');
      }).not.toThrow();

      expect(() => {
        configService.set('llmProvider', 'anthropic');
      }).not.toThrow();

      expect(() => {
        configService.set('llmProvider', 'google');
      }).not.toThrow();

      expect(() => {
        configService.set('llmProvider', 'invalid-provider' as any);
      }).toThrow('Invalid LLM provider');
    });

    test('should validate translation style values', () => {
      expect(() => {
        configService.set('defaultStyle', 'ELI5');
      }).not.toThrow();

      expect(() => {
        configService.set('defaultStyle', 'Business Summary');
      }).not.toThrow();

      expect(() => {
        configService.set('defaultStyle', 'invalid-style' as any);
      }).toThrow('Invalid translation style');
    });

    test('should validate rate limit values', () => {
      expect(() => {
        configService.set('rateLimitPerMinute', 10);
      }).not.toThrow();

      expect(() => {
        configService.set('rateLimitPerMinute', -1);
      }).toThrow('Invalid rate limit');

      expect(() => {
        configService.set('rateLimitPerMinute', 1001);
      }).toThrow('Invalid rate limit');
    });
  });

  describe('Multi-step Navigation State', () => {
    test('should maintain wizard state across configuration updates', () => {
      // Simulate completing multiple wizard steps
      configService.update({
        llmProvider: 'openai',
        slackAppId: 'A12345',
        slackClientId: 'client123',
        defaultLanguage: 'English',
        defaultStyle: 'ELI5',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      });
      configService.save();

      // Load fresh instance
      const newConfigService = new ConfigService(testConfigDir);
      newConfigService.load();

      // Verify all fields persisted
      expect(newConfigService.get('llmProvider')).toBe('openai');
      expect(newConfigService.get('slackAppId')).toBe('A12345');
      expect(newConfigService.get('slackClientId')).toBe('client123');
      expect(newConfigService.get('defaultLanguage')).toBe('English');
      expect(newConfigService.get('defaultStyle')).toBe('ELI5');
      expect(newConfigService.get('rateLimitPerMinute')).toBe(10);
      expect(newConfigService.get('cacheTTL')).toBe(3600);
    });
  });

  describe('Wizard API Error Handling', () => {
    test('should return 400 when required fields are missing', async () => {
      const incompleteData = {
        llmProvider: 'openai',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/setup/complete')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 500 on validation error', async () => {
      const invalidData = {
        llmProvider: 'invalid-provider',
        slackAppId: 'A12345678',
        slackClientId: 'client-id',
        slackWorkspaceId: 'T12345678',
        defaultStyle: 'ELI5',
        defaultLanguage: 'English',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      const response = await request(app)
        .post('/api/v1/setup/complete')
        .send(invalidData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
