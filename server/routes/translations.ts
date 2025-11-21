/**
 * Translation Routes
 * Handles translation history and related endpoints
 */

import { Router, Request, Response } from 'express';
import { ConfigService } from '../config/ConfigService.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { getPrismaClient } from '../database/client.js';
import { z } from 'zod';

const router = Router();

// Initialize config service for auth middleware
const configService = new ConfigService();
configService.load();

// Apply authentication middleware to all translation routes
const authMiddleware = createAuthMiddleware(configService);

/**
 * Query parameters schema for history endpoint
 */
const HistoryQuerySchema = z.object({
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  cursor: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/v1/translations/history
 * Get current user's translation history with cursor-based pagination
 * Requires authentication
 */
router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract user ID from JWT
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found in token',
      });
      return;
    }

    console.log(`[TranslationRoutes] Fetching history for user: ${userId}`);

    // Validate query parameters
    const queryValidation = HistoryQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: queryValidation.error.issues,
      });
      return;
    }

    const { limit, cursor, startDate, endDate } = queryValidation.data;

    // Build query filters
    const where: any = {
      requestedByUserId: userId,
    };

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Cursor-based pagination
    const queryOptions: any = {
      where,
      take: limit + 1, // Fetch one extra to determine if there are more results
      orderBy: {
        createdAt: 'desc' as const,
      },
    };

    if (cursor) {
      queryOptions.cursor = {
        id: cursor,
      };
      queryOptions.skip = 1; // Skip the cursor item itself
    }

    // Fetch translations
    const prisma = getPrismaClient();
    const translations = await prisma.translation.findMany(queryOptions);

    // Determine if there are more results
    const hasMore = translations.length > limit;
    const results = hasMore ? translations.slice(0, limit) : translations;

    // Get next cursor
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Format response
    const formattedResults = results.map((translation) => {
      // Parse original messages JSON
      let messageSnippet = 'No messages';
      try {
        const messages = JSON.parse(translation.originalMessages);
        if (Array.isArray(messages) && messages.length > 0) {
          messageSnippet = messages[0].text || messages[0].content || 'No content';
          // Truncate to 100 characters
          if (messageSnippet.length > 100) {
            messageSnippet = messageSnippet.substring(0, 100) + '...';
          }
        }
      } catch (error) {
        console.error('[TranslationRoutes] Error parsing messages:', error);
      }

      return {
        id: translation.id,
        timestamp: translation.createdAt,
        conversationSnippet: messageSnippet,
        translatedContent: translation.translatedContent,
        targetRole: translation.targetRole,
        language: translation.language,
        llmProvider: translation.llmProvider,
        tokenUsage: translation.tokenUsage,
        conversationId: translation.conversationId,
      };
    });

    res.status(200).json({
      success: true,
      translations: formattedResults,
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    console.error('[TranslationRoutes] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch translation history',
    });
  }
});

/**
 * GET /api/v1/translations/stats
 * Get translation statistics for current user
 * Requires authentication
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found in token',
      });
      return;
    }

    console.log(`[TranslationRoutes] Fetching stats for user: ${userId}`);

    const prisma = getPrismaClient();

    // Get total translation count
    const totalTranslations = await prisma.translation.count({
      where: { requestedByUserId: userId },
    });

    // Get recent translations (last 10)
    const recentTranslations = await prisma.translation.findMany({
      where: { requestedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        translatedContent: true,
        createdAt: true,
        targetRole: true,
      },
    });

    // Get total token usage
    const tokenStats = await prisma.translation.aggregate({
      where: { requestedByUserId: userId },
      _sum: {
        tokenUsage: true,
      },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalTranslations,
        totalTokensUsed: tokenStats._sum.tokenUsage || 0,
        recentTranslations: recentTranslations.map((t) => ({
          id: t.id,
          content: t.translatedContent.substring(0, 100) + '...',
          timestamp: t.createdAt,
          targetRole: t.targetRole,
        })),
      },
    });
  } catch (error) {
    console.error('[TranslationRoutes] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch translation stats',
    });
  }
});

export default router;
