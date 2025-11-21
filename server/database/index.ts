/**
 * Database Module Exports
 * Centralizes database exports for easier imports
 */

// Export Prisma Client and connection management
export { getPrismaClient, prisma, disconnectPrisma } from './client.js';

// Export migration utilities
export { initializeDatabase } from './migrate.js';
