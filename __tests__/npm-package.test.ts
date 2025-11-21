/**
 * npm Package Tests
 * Tests for npm package distribution and CLI commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

describe('npm Package Tests', () => {
  const THREADLE_DIR = path.join(os.homedir(), '.threadle');
  const DATA_DIR = path.join(THREADLE_DIR, 'data');
  const LOGS_DIR = path.join(THREADLE_DIR, 'logs');
  const CONFIG_FILE = path.join(THREADLE_DIR, 'config.json');
  const SECRETS_FILE = path.join(THREADLE_DIR, 'secrets.encrypted');
  const PID_FILE = path.join(THREADLE_DIR, 'threadle.pid');

  // Backup existing .threadle directory if it exists
  const BACKUP_DIR = path.join(os.homedir(), '.threadle-backup-test');

  beforeAll(() => {
    // Backup existing .threadle directory
    if (fs.existsSync(THREADLE_DIR)) {
      if (fs.existsSync(BACKUP_DIR)) {
        fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
      }
      fs.renameSync(THREADLE_DIR, BACKUP_DIR);
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(THREADLE_DIR)) {
      fs.rmSync(THREADLE_DIR, { recursive: true, force: true });
    }

    // Restore backup
    if (fs.existsSync(BACKUP_DIR)) {
      fs.renameSync(BACKUP_DIR, THREADLE_DIR);
    }
  });

  afterEach(async () => {
    // Stop server if running and clean up PID file
    try {
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
        try {
          process.kill(pid, 'SIGTERM');
          // Wait a bit for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          // Process may already be stopped
        }
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('threadle init command', () => {
    beforeEach(() => {
      // Clean up before each test
      if (fs.existsSync(THREADLE_DIR)) {
        fs.rmSync(THREADLE_DIR, { recursive: true, force: true });
      }
    });

    test('should create .threadle directory structure', async () => {
      // Run init command
      const { stdout } = await execAsync('node bin/threadle-init.js');

      // Verify output
      expect(stdout).toContain('Initializing Threadle');
      expect(stdout).toContain('initialized successfully');

      // Verify directory structure
      expect(fs.existsSync(THREADLE_DIR)).toBe(true);
      expect(fs.existsSync(DATA_DIR)).toBe(true);
      expect(fs.existsSync(LOGS_DIR)).toBe(true);
    });

    test('should create config.json with default values', async () => {
      await execAsync('node bin/threadle-init.js');

      expect(fs.existsSync(CONFIG_FILE)).toBe(true);

      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      expect(config).toHaveProperty('setupCompleted', false);
      expect(config).toHaveProperty('port', 3000);
      expect(config).toHaveProperty('llmProvider', 'openai');
      expect(config).toHaveProperty('defaultLanguage', 'English');
      expect(config).toHaveProperty('defaultStyle', 'ELI5');
      expect(config).toHaveProperty('rateLimitPerMinute', 10);
      expect(config).toHaveProperty('cacheTTL', 3600);
    });

    test('should create empty secrets.encrypted file', async () => {
      await execAsync('node bin/threadle-init.js');

      expect(fs.existsSync(SECRETS_FILE)).toBe(true);

      const secrets = fs.readFileSync(SECRETS_FILE, 'utf-8');
      expect(secrets).toBe('{}');
    });

    test('should be idempotent (safe to run multiple times)', async () => {
      // Run init twice
      await execAsync('node bin/threadle-init.js');
      const { stdout } = await execAsync('node bin/threadle-init.js');

      // Should not fail and should indicate files already exist
      expect(stdout).toContain('already exists');
    });
  });

  describe('threadle start command', () => {
    beforeEach(async () => {
      // Clean up and initialize before each test
      if (fs.existsSync(THREADLE_DIR)) {
        fs.rmSync(THREADLE_DIR, { recursive: true, force: true });
      }
      await execAsync('node bin/threadle-init.js');
    });

    test('should fail if not initialized', async () => {
      // Remove config file
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
      }

      // Should fail with helpful error
      await expect(execAsync('node bin/threadle-start.js')).rejects.toThrow();
    });

    test('should start server and create PID file', async () => {
      const { stdout } = await execAsync('node bin/threadle-start.js');

      // Verify output
      expect(stdout).toContain('Threadle started successfully');
      expect(stdout).toContain('PID:');

      // Verify PID file exists
      expect(fs.existsSync(PID_FILE)).toBe(true);

      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
      expect(pid).toBeGreaterThan(0);

      // Verify process is running
      try {
        process.kill(pid, 0);
        // If no error, process is running
        expect(true).toBe(true);
      } catch (error) {
        fail('Server process should be running');
      }
    }, 10000);

    test('should prevent multiple instances', async () => {
      // Start first instance
      await execAsync('node bin/threadle-start.js');

      // Try to start second instance - should fail
      await expect(execAsync('node bin/threadle-start.js')).rejects.toThrow();
    }, 10000);
  });

  describe('threadle stop command', () => {
    beforeEach(async () => {
      // Clean up and initialize
      if (fs.existsSync(THREADLE_DIR)) {
        fs.rmSync(THREADLE_DIR, { recursive: true, force: true });
      }
      await execAsync('node bin/threadle-init.js');
    });

    test('should fail if server not running', async () => {
      // Ensure server is not running
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }

      await expect(execAsync('node bin/threadle-stop.js')).rejects.toThrow();
    });

    test('should stop server gracefully', async () => {
      // Start server
      await execAsync('node bin/threadle-start.js');

      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);

      // Stop server
      const { stdout } = await execAsync('node bin/threadle-stop.js');

      expect(stdout).toContain('Threadle stopped successfully');

      // Verify PID file removed
      expect(fs.existsSync(PID_FILE)).toBe(false);

      // Verify process stopped
      try {
        process.kill(pid, 0);
        fail('Process should be stopped');
      } catch (error) {
        // Expected - process should not exist
        expect(true).toBe(true);
      }
    }, 15000);
  });

  describe('package.json configuration', () => {
    test('should have correct bin entries', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
      );

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin).toHaveProperty('threadle');
      expect(packageJson.bin).toHaveProperty('threadle-init');
      expect(packageJson.bin).toHaveProperty('threadle-start');
      expect(packageJson.bin).toHaveProperty('threadle-stop');
    });

    test('should have required fields for npm publishing', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
      );

      expect(packageJson.name).toBe('threadle');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.description).toBeDefined();
      expect(packageJson.license).toBe('MIT');
      expect(packageJson.repository).toBeDefined();
      expect(packageJson.homepage).toBeDefined();
      expect(packageJson.bugs).toBeDefined();
      expect(packageJson.keywords).toContain('slack');
      expect(packageJson.keywords).toContain('bot');
      expect(packageJson.keywords).toContain('translator');
    });

    test('should have files array configured', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
      );

      expect(packageJson.files).toBeDefined();
      expect(Array.isArray(packageJson.files)).toBe(true);
      expect(packageJson.files).toContain('dist/');
      expect(packageJson.files).toContain('bin/');
      expect(packageJson.files).toContain('client/dist/');
    });
  });
});
