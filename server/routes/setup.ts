/**
 * Setup Routes
 * Handles setup wizard completion and configuration updates.
 */

import { Router, Request, Response } from 'express';
import { ConfigService, SecretsService } from '../config/index.js';
import { getPrismaClient } from '../database/client.js';
import { Language, UserRole } from '@prisma/client';

const router = Router();

interface CompleteSetupRequest {
  llmProvider: string;
  slackAppId: string;
  slackClientId: string;
  slackWorkspaceId: string;
  defaultStyle: string;
  defaultLanguage: string;
  rateLimitPerMinute: number;
  cacheTTL: number;
}

interface LLMConfigRequest {
  provider: string;
  apiKey: string;
  model: string;
}

interface SlackConfigRequest {
  appId: string;
  clientId: string;
  clientSecret: string;
  signingSecret: string;
}

interface GlobalSettingsRequest {
  defaultStyle: string;
  defaultLanguage: string;
  rateLimitPerMinute: number;
  cacheTTL: number;
}

interface AdminUserRequest {
  slackUserId: string;
  slackWorkspaceId: string;
}

/**
 * POST /api/v1/setup/llm-config
 * Step 2: Configure LLM provider and API key
 */
router.post('/llm-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: LLMConfigRequest = req.body;

    // Validate required fields
    if (!data.provider || !data.apiKey || !data.model) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'provider, apiKey, and model are required',
      });
      return;
    }

    // Validate provider
    const validProviders = ['openai', 'anthropic', 'google'];
    if (!validProviders.includes(data.provider)) {
      res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`,
      });
      return;
    }

    // Get services
    const configService = new ConfigService();
    const secretsService = new SecretsService();
    configService.load();

    // Save provider to config
    configService.set('llmProvider', data.provider as any);
    configService.save();

    // Save API key to encrypted secrets
    secretsService.updateSecret('llmApiKey', data.apiKey);

    res.status(200).json({
      success: true,
      message: 'LLM configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving LLM config:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/setup/slack-config
 * Step 3: Configure Slack app credentials
 */
router.post('/slack-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: SlackConfigRequest = req.body;

    // Validate required fields
    if (!data.appId || !data.clientId || !data.clientSecret || !data.signingSecret) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'appId, clientId, clientSecret, and signingSecret are required',
      });
      return;
    }

    // Get services
    const configService = new ConfigService();
    const secretsService = new SecretsService();
    configService.load();

    // Save public values to config
    configService.update({
      slackAppId: data.appId,
      slackClientId: data.clientId,
    });
    configService.save();

    // Save secrets to encrypted storage
    secretsService.updateSecret('slackClientSecret', data.clientSecret);
    secretsService.updateSecret('slackSigningSecret', data.signingSecret);

    res.status(200).json({
      success: true,
      message: 'Slack configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving Slack config:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/setup/global-settings
 * Step 5: Configure global default settings
 */
router.post('/global-settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: GlobalSettingsRequest = req.body;

    // Validate required fields
    if (!data.defaultStyle || !data.defaultLanguage) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'defaultStyle and defaultLanguage are required',
      });
      return;
    }

    // Get config service
    const configService = new ConfigService();
    configService.load();

    // Update configuration
    configService.update({
      defaultStyle: data.defaultStyle as any,
      defaultLanguage: data.defaultLanguage as any,
      rateLimitPerMinute: data.rateLimitPerMinute || 10,
      cacheTTL: data.cacheTTL || 3600,
    });
    configService.save();

    res.status(200).json({
      success: true,
      message: 'Global settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving global settings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/setup/admin-user
 * Step 6: Create admin user account
 */
router.post('/admin-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: AdminUserRequest = req.body;

    // Validate required fields
    if (!data.slackUserId || !data.slackWorkspaceId) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'slackUserId and slackWorkspaceId are required',
      });
      return;
    }

    // Get Prisma client
    const prisma = getPrismaClient();

    // Create admin user in database
    const user = await prisma.user.upsert({
      where: { slackUserId: data.slackUserId },
      update: {
        isAdmin: true,
        slackWorkspaceId: data.slackWorkspaceId,
      },
      create: {
        slackUserId: data.slackUserId,
        slackWorkspaceId: data.slackWorkspaceId,
        role: UserRole.Product, // Default role, user can change later
        language: Language.English,
        isAdmin: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Admin user created successfully',
      userId: user.id,
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/setup/complete
 * Completes the setup wizard by saving configuration and marking setup as complete
 */
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CompleteSetupRequest = req.body;

    // Validate required fields
    if (!data.llmProvider || !data.slackAppId || !data.slackClientId) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'llmProvider, slackAppId, and slackClientId are required',
      });
      return;
    }

    // Get config service instance
    const configService = new ConfigService();
    configService.load();

    // Update configuration
    configService.update({
      llmProvider: data.llmProvider as any,
      slackAppId: data.slackAppId,
      slackClientId: data.slackClientId,
      slackWorkspaceId: data.slackWorkspaceId,
      defaultStyle: data.defaultStyle as any,
      defaultLanguage: data.defaultLanguage as any,
      rateLimitPerMinute: data.rateLimitPerMinute,
      cacheTTL: data.cacheTTL,
    });

    // Mark setup as completed
    configService.completeSetup();

    res.status(200).json({
      success: true,
      message: 'Setup completed successfully',
    });
  } catch (error) {
    console.error('Error completing setup:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
