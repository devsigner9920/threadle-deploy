/**
 * Database Migration Runner
 * Handles running Prisma migrations on application startup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Initialize database and run migrations
 * Should be called before starting the server
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.error('Initializing database...');

    // Ensure data directory exists
    const dataDir = path.join(os.homedir(), '.threadle', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.error(`Created data directory: ${dataDir}`);
    }

    // Set DATABASE_URL if not already set
    if (!process.env['DATABASE_URL']) {
      const dbPath = path.join(dataDir, 'threadle.db');
      process.env['DATABASE_URL'] = `file:${dbPath}`;
      console.error(`Using database: ${dbPath}`);
    }

    // Run migrations using Prisma CLI
    console.error('Running database migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      env: process.env,
    });

    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);

    // Initialize Prisma Client
    const { getPrismaClient } = await import('./client.js');
    const prisma = getPrismaClient();

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.error('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Alias for initializeDatabase (for consistency with other parts of codebase)
 */
export const runMigrations = initializeDatabase;
