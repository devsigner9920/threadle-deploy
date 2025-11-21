/**
 * Docker Deployment Tests
 * Tests for Docker image builds, container startup, and deployment
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Docker Deployment', () => {
  const projectRoot = join(__dirname, '..');

  describe('Dockerfile validation', () => {
    it('should have a valid Dockerfile in project root', () => {
      const dockerfilePath = join(projectRoot, 'Dockerfile');
      expect(existsSync(dockerfilePath)).toBe(true);

      const dockerfileContent = readFileSync(dockerfilePath, 'utf-8');

      // Verify multi-stage build
      expect(dockerfileContent).toContain('FROM node:');
      expect(dockerfileContent).toContain('AS builder');
      expect(dockerfileContent).toContain('AS runtime');

      // Verify working directory
      expect(dockerfileContent).toContain('WORKDIR /app');

      // Verify port exposure
      expect(dockerfileContent).toContain('EXPOSE 3000');

      // Verify volume for data
      expect(dockerfileContent).toContain('VOLUME ["/app/data"]');
    });

    it('should have a .dockerignore file to exclude unnecessary files', () => {
      const dockerignorePath = join(projectRoot, '.dockerignore');
      expect(existsSync(dockerignorePath)).toBe(true);

      const dockerignoreContent = readFileSync(dockerignorePath, 'utf-8');

      // Should exclude common development files
      expect(dockerignoreContent).toContain('node_modules');
      expect(dockerignoreContent).toContain('.git');
      expect(dockerignoreContent).toContain('__tests__');
    });
  });

  describe('Docker Compose configuration', () => {
    it('should have a docker-compose.yml file with proper configuration', () => {
      const composePath = join(projectRoot, 'docker-compose.yml');
      expect(existsSync(composePath)).toBe(true);

      const composeContent = readFileSync(composePath, 'utf-8');

      // Verify service definition
      expect(composeContent).toContain('threadle:');

      // Verify volume mapping
      expect(composeContent).toContain('./threadle-data:/app/data');

      // Verify port mapping
      expect(composeContent).toContain('3000:3000');

      // Verify restart policy
      expect(composeContent).toContain('restart: unless-stopped');
    });
  });

  describe('Docker entrypoint script', () => {
    it('should have an entrypoint script that runs migrations', () => {
      const entrypointPath = join(projectRoot, 'docker-entrypoint.sh');
      expect(existsSync(entrypointPath)).toBe(true);

      const entrypointContent = readFileSync(entrypointPath, 'utf-8');

      // Verify shebang
      expect(entrypointContent).toContain('#!/bin/sh');

      // Verify migrations are run
      expect(entrypointContent).toContain('prisma migrate deploy');

      // Verify server starts
      expect(entrypointContent).toContain('node dist/server/index.js');
    });
  });

  describe('Docker README documentation', () => {
    it('should have DOCKER_README.md with usage instructions', () => {
      const dockerReadmePath = join(projectRoot, 'DOCKER_README.md');
      expect(existsSync(dockerReadmePath)).toBe(true);

      const readmeContent = readFileSync(dockerReadmePath, 'utf-8');

      // Verify usage instructions
      expect(readmeContent).toContain('docker run');
      expect(readmeContent).toContain('-p 3000:3000');
      expect(readmeContent).toContain('-v threadle-data:/app/data');

      // Verify docker-compose usage
      expect(readmeContent).toContain('docker-compose up');

      // Verify environment variables section
      expect(readmeContent).toContain('Environment Variables');

      // Verify volume management section
      expect(readmeContent).toContain('Volume Management');
    });
  });

  describe('Docker image build (simulated)', () => {
    it('should have package.json with docker build script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Verify docker-related scripts exist
      expect(packageJson.scripts).toHaveProperty('docker:build');
      expect(packageJson.scripts).toHaveProperty('docker:run');
    });
  });

  describe('Data persistence configuration', () => {
    it('should configure SQLite database path for Docker volume', () => {
      const prismaConfigPath = join(projectRoot, 'prisma.config.ts');

      if (existsSync(prismaConfigPath)) {
        const configContent = readFileSync(prismaConfigPath, 'utf-8');

        // Should support environment-based database path
        expect(configContent).toMatch(/DATABASE_URL|DB_PATH/);
      }
    });
  });

  describe('Container health checks', () => {
    it('should have health check endpoint configured in server', () => {
      const serverPath = join(projectRoot, 'server/index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');

      // Verify health check endpoint exists
      expect(serverContent).toContain('/health');
      expect(serverContent).toContain('status: \'ok\'');
    });
  });

  describe('Migration automation', () => {
    it('should run migrations automatically on container start', () => {
      const migratePath = join(projectRoot, 'server/database/migrate.ts');

      if (existsSync(migratePath)) {
        const migrateContent = readFileSync(migratePath, 'utf-8');

        // Should support running migrations programmatically
        expect(migrateContent).toContain('migrate');
      }
    });
  });
});
