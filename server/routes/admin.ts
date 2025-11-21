/**
 * Admin Routes
 * Handles admin-only endpoints for system management
 */

import { Router, Request, Response } from 'express';
import { ConfigService } from '../config/ConfigService.js';
import { SecretsService } from '../config/SecretsService.js';
import { TranslationService } from '../translation/TranslationService.js';
import { UserService } from '../user/UserService.js';
import { createSlackClient } from '../slack/slackClient.js';
import { createAdminMiddleware } from '../middleware/authMiddleware.js';
import { getPrismaClient } from '../database/client.js';
import { z } from 'zod';

const router = Router();

// Shared instances (in production, these would be dependency-injected)
let translationService: TranslationService | null = null;
let userService: UserService | null = null;

/**
 * Get or create translation service instance
 */
function getTranslationService(): TranslationService {
  if (!translationService) {
    const configService = new ConfigService();
    const secretsService = new SecretsService();
    configService.load();
    translationService = new TranslationService(configService, secretsService);
  }
  return translationService;
}

/**
 * Get or create user service instance
 */
function getUserService(): UserService {
  if (!userService) {
    const secretsService = new SecretsService();
    const slackClient = createSlackClient(secretsService);
    userService = new UserService(slackClient);
  }
  return userService;
}

// Initialize config service for admin middleware
const configService = new ConfigService();
configService.load();

// Apply admin authentication middleware to all routes
const adminMiddleware = createAdminMiddleware(configService);

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 * Returns hit rate, miss rate, cache size, and other metrics
 */
router.get('/cache/stats', adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const service = getTranslationService();
    const cacheService = service.getCacheService();
    const stats = cacheService.getStats();

    res.status(200).json({
      success: true,
      stats: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        hitRatePercentage: `${(stats.hitRate * 100).toFixed(2)}%`,
        size: stats.size,
        totalRequests: stats.hits + stats.misses,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v1/admin/cache
 * Clear all cached translations
 * Admin-only operation to reset cache
 */
router.delete('/cache', adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const service = getTranslationService();
    await service.clearCache();

    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/settings
 * Get all global settings
 * Admin-only endpoint
 */
router.get('/settings', adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const configService = new ConfigService();
    configService.load();

    const config = configService.getAll();

    // Don't expose sensitive fields
    const safeConfig = {
      setupCompleted: config.setupCompleted,
      port: config.port,
      llmProvider: config.llmProvider,
      slackAppId: config.slackAppId,
      slackClientId: config.slackClientId,
      slackWorkspaceId: config.slackWorkspaceId,
      defaultLanguage: config.defaultLanguage,
      defaultStyle: config.defaultStyle,
      rateLimitPerMinute: config.rateLimitPerMinute,
      cacheTTL: config.cacheTTL,
    };

    res.status(200).json({
      success: true,
      settings: safeConfig,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/admin/settings
 * Update global settings
 * Admin-only endpoint
 */
router.put('/settings', adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const configService = new ConfigService();
    configService.load();

    // Validate and update allowed fields
    const allowedUpdates = [
      'defaultLanguage',
      'defaultStyle',
      'rateLimitPerMinute',
      'cacheTTL',
      'llmProvider',
    ];

    const updates: any = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid updates provided',
      });
      return;
    }

    // Apply updates
    configService.update(updates);
    configService.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      updated: updates,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/users
 * List all users with roles
 * Admin-only endpoint
 */
router.get('/users', adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[AdminRoutes] Listing all users');

    // Use Prisma directly instead of UserService to avoid Slack client dependency
    const prisma = getPrismaClient();
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return users with safe fields
    const safeUsers = users.map((user) => ({
      id: user.id,
      slackUserId: user.slackUserId,
      role: user.role,
      language: user.language,
      preferredStyle: user.preferredStyle,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.status(200).json({
      success: true,
      users: safeUsers,
      count: safeUsers.length,
    });
  } catch (error) {
    console.error('[AdminRoutes] Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/admin/users/:userId
 * Update user role or admin status
 * Admin-only endpoint
 */
router.put('/users/:userId', adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    // TypeScript type guard for userId
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }
    const { role, isAdmin } = req.body;

    console.log(`[AdminRoutes] Updating user: ${userId}`);

    // Use Prisma directly to avoid Slack client dependency
    const prisma = getPrismaClient();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Build updates object
    const updates: any = {};
    if (role !== undefined) {
      updates.role = role;
    }
    if (isAdmin !== undefined) {
      updates.isAdmin = isAdmin;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid updates provided',
      });
      return;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        slackUserId: updatedUser.slackUserId,
        role: updatedUser.role,
        language: updatedUser.language,
        isAdmin: updatedUser.isAdmin,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('[AdminRoutes] Error updating user:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Usage query parameters schema
 */
const UsageQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/v1/admin/usage
 * Get aggregated usage statistics
 * Admin-only endpoint
 *
 * Query parameters:
 * - startDate: ISO date string for start of date range (optional)
 * - endDate: ISO date string for end of date range (optional)
 *
 * Returns:
 * - totalTranslations: Total number of translations
 * - totalTokens: Total tokens consumed
 * - activeUsers: Number of users who have requested translations
 * - byUser: Array of per-user statistics
 * - byDate: Array of daily statistics (if date range provided)
 */
router.get('/usage', adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[AdminRoutes] Fetching usage statistics');

    // Validate query parameters
    const queryValidation = UsageQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: queryValidation.error.issues,
      });
      return;
    }

    const { startDate, endDate } = queryValidation.data;

    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    const prisma = getPrismaClient();

    // Get total translation count
    const totalTranslations = await prisma.translation.count({
      where: dateFilter,
    });

    // Get total token usage
    const tokenStats = await prisma.translation.aggregate({
      where: dateFilter,
      _sum: {
        tokenUsage: true,
      },
    });

    // Get active users count
    const activeUsersResult = await prisma.translation.groupBy({
      by: ['requestedByUserId'],
      where: dateFilter,
      _count: {
        requestedByUserId: true,
      },
    });

    const activeUsers = activeUsersResult.length;

    // Get usage grouped by user
    const userGrouping = await prisma.translation.groupBy({
      by: ['requestedByUserId'],
      where: dateFilter,
      _count: {
        id: true,
      },
      _sum: {
        tokenUsage: true,
      },
    });

    // Fetch user details for the grouped results
    const userIds = userGrouping.map((g) => g.requestedByUserId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        slackUserId: true,
        role: true,
      },
    });

    // Map user details to usage stats
    const userMap = new Map(users.map((u) => [u.id, u]));
    const byUser = userGrouping.map((group) => {
      const user = userMap.get(group.requestedByUserId);
      return {
        userId: group.requestedByUserId,
        slackUserId: user?.slackUserId || 'unknown',
        role: user?.role || 'unknown',
        translationCount: group._count.id,
        totalTokens: group._sum.tokenUsage || 0,
      };
    });

    // Sort by translation count descending
    byUser.sort((a, b) => b.translationCount - a.translationCount);

    // Get usage grouped by date (if date range provided)
    let byDate = undefined;
    if (startDate || endDate) {
      // Fetch all translations within range
      const translations = await prisma.translation.findMany({
        where: dateFilter,
        select: {
          createdAt: true,
          tokenUsage: true,
        },
      });

      // Group by date manually (SQLite doesn't have great date grouping)
      const dateMap = new Map<string, { count: number; tokens: number }>();

      for (const translation of translations) {
        const dateKey = translation.createdAt.toISOString().split('T')[0];
        const existing = dateMap.get(dateKey) || { count: 0, tokens: 0 };
        dateMap.set(dateKey, {
          count: existing.count + 1,
          tokens: existing.tokens + translation.tokenUsage,
        });
      }

      byDate = Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          translationCount: stats.count,
          totalTokens: stats.tokens,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Build response
    const response: any = {
      success: true,
      usage: {
        totalTranslations,
        totalTokens: tokenStats._sum.tokenUsage || 0,
        activeUsers,
        byUser,
      },
    };

    if (byDate !== undefined) {
      response.usage.byDate = byDate;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('[AdminRoutes] Error fetching usage statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
