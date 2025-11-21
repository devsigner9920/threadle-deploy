/**
 * Prisma Client Singleton
 * Manages database connection and ensures single instance
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import os from 'os';

// Singleton instance
let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma Client instance
 * @returns PrismaClient instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Determine database URL
    let databaseUrl = process.env['DATABASE_URL'];

    if (!databaseUrl) {
      const dbPath = path.join(os.homedir(), '.threadle', 'data', 'threadle.db');
      databaseUrl = `file:${dbPath}`;
    }

    // Create adapter with config
    const adapter = new PrismaLibSql({
      url: databaseUrl,
    });

    prisma = new PrismaClient({
      adapter,
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Set a custom Prisma client instance (for testing)
 * @param client - Prisma client instance to use
 */
export function setPrismaClient(client: PrismaClient): void {
  prisma = client;
}

/**
 * Reset the Prisma client singleton (for testing)
 */
export function resetPrismaClient(): void {
  prisma = null;
}

/**
 * Disconnect from database
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Export singleton instance for direct access
export { prisma };
