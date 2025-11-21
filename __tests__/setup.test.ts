import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Project Setup Tests', () => {
  describe('1.1.1 - package.json has correct bin entries', () => {
    test('should have threadle-init bin entry', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
      );

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin['threadle-init']).toBe('./bin/threadle-init.js');
    });

    test('should have threadle-start bin entry', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
      );

      expect(packageJson.bin['threadle-start']).toBe('./bin/threadle-start.js');
    });

    test('should have threadle-stop bin entry', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
      );

      expect(packageJson.bin['threadle-stop']).toBe('./bin/threadle-stop.js');
    });
  });

  describe('1.1.2 - TypeScript compilation works', () => {
    test('should compile TypeScript without errors', () => {
      // This test will pass once tsconfig.json is set up correctly
      expect(() => {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('1.1.3 - Express server can be imported', () => {
    test('should export app from server/index', () => {
      // Check that the compiled file exists
      const serverPath = path.join(__dirname, '../dist/server/index.js');
      expect(fs.existsSync(serverPath)).toBe(true);
    });
  });

  describe('1.1.4 - Health check endpoint responds', () => {
    test('should respond with 200 OK on /health endpoint', async () => {
      // Import the app dynamically (CommonJS style for Jest)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('../dist/server/index.js');

      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});
