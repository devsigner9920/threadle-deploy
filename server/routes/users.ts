/**
 * User Routes
 * Handles user profile endpoints
 */

import { Router, Request, Response } from 'express';
import { ConfigService, SecretsService } from '../config/index.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { UserService, UpdateUserSchema } from '../user/UserService.js';
import { createSlackClient } from '../slack/slackClient.js';
import { z } from 'zod';

const router = Router();

// Initialize services
const configService = new ConfigService();
configService.load();

const secretsService = new SecretsService();

// Lazy initialize SlackClient only if setup is completed
let slackClient: ReturnType<typeof createSlackClient> | null = null;
let userService: UserService | null = null;

function ensureServicesInitialized() {
  if (!configService.get('setupCompleted')) {
    throw new Error('Application setup not completed');
  }

  if (!slackClient) {
    slackClient = createSlackClient(secretsService);
    userService = new UserService(slackClient);
  }

  return { slackClient, userService: userService! };
}

// Apply authentication middleware to all user routes
const authMiddleware = createAuthMiddleware(configService);

/**
 * Zod schema for profile update request
 */
const UpdateProfileSchema = z.object({
  role: z.string().optional(),
  language: z.string().optional(),
  customInstructions: z.string().optional(),
  preferredStyle: z.string().optional(),
});

/**
 * GET /api/v1/users/profile
 * Get current user's profile
 * Requires authentication
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    console.log(`[UserRoutes] Fetching profile for user: ${userId}`);

    // Ensure services are initialized
    const { userService } = ensureServicesInitialized();

    // Fetch user profile from database
    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Return profile (exclude sensitive fields)
    res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        slackUserId: user.slackUserId,
        role: user.role,
        language: user.language,
        customInstructions: user.customInstructions,
        preferredStyle: user.preferredStyle,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[UserRoutes] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch profile',
    });
  }
});

/**
 * PUT /api/v1/users/profile
 * Update current user's profile
 * Requires authentication
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    console.log(`[UserRoutes] Updating profile for user: ${userId}`);

    // Validate request body
    const validation = UpdateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: validation.error.issues,
      });
      return;
    }

    const updates = validation.data;

    // Convert role and language strings to enums if provided
    // Ensure services are initialized
    const { userService } = ensureServicesInitialized();

    const updateData: any = {};

    if (updates.role) {
      updateData.role = updates.role;
    }

    if (updates.language) {
      updateData.language = updates.language;
    }

    if (updates.customInstructions !== undefined) {
      updateData.customInstructions = updates.customInstructions;
    }

    if (updates.preferredStyle !== undefined) {
      updateData.preferredStyle = updates.preferredStyle;
    }

    // Validate with UserService schema
    try {
      UpdateUserSchema.parse(updateData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid profile data',
          details: error.issues,
        });
        return;
      }
      throw error;
    }

    // Update user profile
    const updatedUser = await userService.updateUser(userId, updateData);

    // Return updated profile
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: updatedUser.id,
        slackUserId: updatedUser.slackUserId,
        role: updatedUser.role,
        language: updatedUser.language,
        customInstructions: updatedUser.customInstructions,
        preferredStyle: updatedUser.preferredStyle,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('[UserRoutes] Error updating profile:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to update profile',
    });
  }
});

export default router;
