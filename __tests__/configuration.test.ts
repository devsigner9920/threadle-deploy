import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';

describe('Configuration Tests (Task Group 3)', () => {
  const testConfigDir = path.join(os.tmpdir(), '.threadle-test-' + Date.now());
  const testConfigPath = path.join(testConfigDir, 'config.json');
  const testSecretsPath = path.join(testConfigDir, 'secrets.encrypted');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clear environment variables
    delete process.env['THREADLE_PORT'];
    delete process.env['THREADLE_LLM_PROVIDER'];
    delete process.env['THREADLE_SLACK_BOT_TOKEN'];
  });

  describe('3.1.1 - config.json loads correctly', () => {
    test('should create default config if file does not exist', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      const config = configService.getAll();
      expect(config.setupCompleted).toBe(false);
      expect(config.port).toBe(3000);
      expect(config.llmProvider).toBe('openai');
      expect(config.defaultLanguage).toBe('English');
      expect(config.defaultStyle).toBe('ELI5');
      expect(config.rateLimitPerMinute).toBe(10);
      expect(config.cacheTTL).toBe(3600);
    });

    test('should load existing config.json correctly', () => {
      const testConfig = {
        setupCompleted: true,
        port: 4000,
        llmProvider: 'anthropic',
        slackAppId: 'A123456',
        slackClientId: 'C123456',
        defaultLanguage: 'Spanish',
        defaultStyle: 'Technical Lite',
        rateLimitPerMinute: 20,
        cacheTTL: 7200,
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

      const configService = new ConfigService(testConfigDir);
      configService.load();

      const config = configService.getAll();
      expect(config.setupCompleted).toBe(true);
      expect(config.port).toBe(4000);
      expect(config.llmProvider).toBe('anthropic');
      expect(config.slackAppId).toBe('A123456');
      expect(config.defaultLanguage).toBe('Spanish');
    });

    test('should persist config to disk when saved', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();
      configService.set('setupCompleted', true);
      configService.set('port', 5000);
      configService.save();

      // Read file directly to verify
      const savedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'));
      expect(savedConfig.setupCompleted).toBe(true);
      expect(savedConfig.port).toBe(5000);
    });
  });

  describe('3.1.2 - Secrets encryption/decryption works', () => {
    test('should encrypt and decrypt secrets correctly', () => {
      const secretsService = new SecretsService(testConfigDir);

      const secrets = {
        slackClientSecret: 'secret123',
        slackSigningSecret: 'signing456',
        slackBotToken: 'xoxb-token789',
        llmApiKey: 'sk-key000',
      };

      secretsService.saveSecrets(secrets);

      // Verify file was encrypted (not plaintext)
      const encryptedContent = fs.readFileSync(testSecretsPath, 'utf-8');
      expect(encryptedContent).not.toContain('secret123');
      expect(encryptedContent).not.toContain('xoxb-token789');

      // Load and decrypt
      const decryptedSecrets = secretsService.loadSecrets();
      expect(decryptedSecrets.slackClientSecret).toBe('secret123');
      expect(decryptedSecrets.slackSigningSecret).toBe('signing456');
      expect(decryptedSecrets.slackBotToken).toBe('xoxb-token789');
      expect(decryptedSecrets.llmApiKey).toBe('sk-key000');
    });

    test('should handle empty secrets file gracefully', () => {
      const secretsService = new SecretsService(testConfigDir);
      const secrets = secretsService.loadSecrets();

      expect(secrets).toEqual({
        slackClientSecret: '',
        slackSigningSecret: '',
        slackBotToken: '',
        llmApiKey: '',
      });
    });

    test('should use AES-256 encryption', () => {
      const secretsService = new SecretsService(testConfigDir);

      secretsService.saveSecrets({
        slackClientSecret: 'test-secret',
        slackSigningSecret: 'test-signing',
        slackBotToken: 'test-token',
        llmApiKey: 'test-key',
      });

      const encryptedContent = fs.readFileSync(testSecretsPath, 'utf-8');
      const data = JSON.parse(encryptedContent);

      // Verify it has encryption metadata
      expect(data.algorithm).toBe('aes-256-gcm');
      expect(data.encrypted).toBeDefined();
      expect(data.iv).toBeDefined();
      expect(data.authTag).toBeDefined();
    });
  });

  describe('3.1.3 - Missing config shows first-time setup flag', () => {
    test('should set setupCompleted to false by default', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(configService.get('setupCompleted')).toBe(false);
    });

    test('should indicate first-time setup when config does not exist', () => {
      const configService = new ConfigService(testConfigDir);
      const isFirstTime = configService.isFirstTimeSetup();

      expect(isFirstTime).toBe(true);
    });

    test('should not indicate first-time setup when setupCompleted is true', () => {
      const testConfig = {
        setupCompleted: true,
        port: 3000,
        llmProvider: 'openai',
        defaultLanguage: 'English',
        defaultStyle: 'ELI5',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(configService.isFirstTimeSetup()).toBe(false);
    });
  });

  describe('3.1.4 - Environment variable overrides', () => {
    test('should override port from THREADLE_PORT env var', () => {
      process.env['THREADLE_PORT'] = '8080';

      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(configService.get('port')).toBe(8080);
    });

    test('should override llmProvider from THREADLE_LLM_PROVIDER', () => {
      process.env['THREADLE_LLM_PROVIDER'] = 'anthropic';

      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(configService.get('llmProvider')).toBe('anthropic');
    });

    test('should override secrets from environment variables', () => {
      process.env['THREADLE_SLACK_BOT_TOKEN'] = 'xoxb-env-token';
      process.env['THREADLE_LLM_API_KEY'] = 'sk-env-key';

      const secretsService = new SecretsService(testConfigDir);
      const secrets = secretsService.loadSecrets();

      expect(secrets.slackBotToken).toBe('xoxb-env-token');
      expect(secrets.llmApiKey).toBe('sk-env-key');
    });

    test('should prioritize env vars over config.json', () => {
      const testConfig = {
        setupCompleted: true,
        port: 3000,
        llmProvider: 'openai',
        defaultLanguage: 'English',
        defaultStyle: 'ELI5',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

      process.env['THREADLE_PORT'] = '9000';
      process.env['THREADLE_LLM_PROVIDER'] = 'google';

      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(configService.get('port')).toBe(9000);
      expect(configService.get('llmProvider')).toBe('google');
    });
  });

  describe('3.1.5 - ConfigService provides type-safe access', () => {
    test('should get and set config values by key', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      configService.set('port', 4500);
      expect(configService.get('port')).toBe(4500);

      configService.set('llmProvider', 'anthropic');
      expect(configService.get('llmProvider')).toBe('anthropic');
    });

    test('should validate port is a number', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(() => {
        configService.set('port', 'invalid' as any);
      }).toThrow();
    });

    test('should validate llmProvider is valid value', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      expect(() => {
        configService.set('llmProvider', 'invalid-provider' as any);
      }).toThrow();
    });

    test('should return all config as object', () => {
      const configService = new ConfigService(testConfigDir);
      configService.load();

      const config = configService.getAll();

      expect(config).toHaveProperty('setupCompleted');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('llmProvider');
      expect(config).toHaveProperty('defaultLanguage');
      expect(config).toHaveProperty('defaultStyle');
    });
  });
});
