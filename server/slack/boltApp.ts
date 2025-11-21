/**
 * Slack Bolt App Configuration
 * Initializes and configures the Slack Bolt application
 * with proper settings for HTTP mode and Express integration.
 */

import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import { SecretsService } from '../config/index.js';

/**
 * Create and configure Slack Bolt app
 * @param secretsService - Secrets service instance
 * @returns Configured Bolt App instance
 */
export function createBoltApp(secretsService: SecretsService): App {
  // Get Slack credentials from secrets
  const signingSecret = secretsService.getSecret('slackSigningSecret');
  const botToken = secretsService.getSecret('slackBotToken');

  if (!signingSecret) {
    throw new Error('Slack signing secret not configured');
  }

  // Bot token might not be available during initial setup
  // We'll handle this gracefully
  const tokenAvailable = !!botToken;

  // Create Express receiver for HTTP mode
  const receiver = new ExpressReceiver({
    signingSecret,
    // Process before response is required for Express integration
    processBeforeResponse: true,
  });

  // Determine log level from environment variable
  const logLevelEnv = process.env['SLACK_LOG_LEVEL'];
  const logLevel = (logLevelEnv as LogLevel) || LogLevel.INFO;

  // Create Bolt app
  const app = new App({
    token: tokenAvailable ? botToken : undefined,
    receiver,
    // Set log level based on environment
    logLevel,
  });

  // Global error handler
  app.error(async (error) => {
    console.error('Slack Bolt error:', error);
  });

  return app;
}

/**
 * Check if Bolt app is properly configured with bot token
 * @param app - Bolt App instance
 * @returns true if bot token is configured
 */
export function isBoltAppConfigured(app: App): boolean {
  return !!app.client.token;
}
