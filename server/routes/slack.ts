/**
 * Slack Routes
 * Handles Slack OAuth, webhook endpoints, and slash commands.
 */

import { Router, Request, Response } from 'express';
import { ConfigService, SecretsService } from '../config/index.js';
import { slackSignatureVerificationMiddleware } from '../slack/signatureVerification.js';
import {
  SlackCommandPayload,
  handleHelpCommand,
  handleSetProfileCommand,
  handleExplainCommand,
  validateCommand,
} from '../commands/index.js';
import {
  SlackEventPayload,
  MessageEvent,
  AppMentionEvent,
  InteractivePayload,
  eventDeduplicationCache,
  handleMessageEvent,
  handleAppMentionEvent,
  handleInteractivePayload,
} from '../events/index.js';

const router = Router();

/**
 * Slack OAuth v2 access response interface
 */
interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

/**
 * POST /api/v1/slack/oauth
 * Handles Slack OAuth callback
 * Exchanges authorization code for access token using Slack OAuth API
 */
router.get('/oauth', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, error } = req.query;

    // Handle OAuth errors from Slack
    if (error) {
      console.error('OAuth error from Slack:', error);
      res.status(400).json({
        error: 'OAuth authorization failed',
        message: error as string,
      });
      return;
    }

    // Validate code parameter
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        error: 'Missing authorization code',
        message: 'OAuth callback requires a code parameter',
      });
      return;
    }

    // Get configuration
    const configService = new ConfigService();
    const secretsService = new SecretsService();
    configService.load();

    const clientId = configService.get('slackClientId');
    const clientSecret = secretsService.getSecret('slackClientSecret');

    if (!clientId || !clientSecret) {
      res.status(500).json({
        error: 'Configuration error',
        message: 'Slack client credentials not configured',
      });
      return;
    }

    console.log('Exchanging OAuth code for access token...');

    // Exchange code for access token using Slack OAuth v2 API
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const data = (await response.json()) as SlackOAuthResponse;

    // Check if OAuth exchange was successful
    if (!data.ok || !data.access_token) {
      console.error('OAuth exchange failed:', data.error || 'Unknown error');
      res.status(400).json({
        error: 'OAuth exchange failed',
        message: data.error || 'Failed to exchange authorization code for token',
      });
      return;
    }

    // Extract bot token and workspace info
    const botToken = data.access_token;
    const workspaceId = data.team?.id;
    const workspaceName = data.team?.name;

    if (!botToken || !workspaceId) {
      console.error('Missing bot token or workspace ID in OAuth response');
      res.status(400).json({
        error: 'OAuth response incomplete',
        message: 'Missing required data in OAuth response',
      });
      return;
    }

    console.log(`OAuth successful for workspace: ${workspaceName} (${workspaceId})`);

    // Store bot token encrypted in secrets.encrypted
    secretsService.updateSecret('slackBotToken', botToken);

    // Update config with workspace details
    configService.update({
      slackWorkspaceId: workspaceId,
    });
    configService.save();

    console.log('Bot token and workspace info saved successfully');

    // Redirect to wizard Step 4 with success message
    res.redirect('/setup?step=5&oauth=success');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/slack/events
 * Handles Slack Events API webhook
 * Processes message events, app mentions, and other Slack events
 */
router.post('/events', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const payload = req.body as SlackEventPayload;

    // Handle URL verification challenge on first setup
    if (payload.type === 'url_verification') {
      console.log('Handling URL verification challenge');
      res.status(200).json({ challenge: payload.challenge });
      return;
    }

    // Acknowledge event immediately (within 3 seconds)
    res.status(200).send();

    // Process event callback asynchronously (background job)
    if (payload.type === 'event_callback' && payload.event) {
      // Check for duplicate event
      if (payload.event_id) {
        if (eventDeduplicationCache.isDuplicate(payload.event_id)) {
          console.log(`Skipping duplicate event: ${payload.event_id}`);
          return;
        }

        // Mark event as processed
        eventDeduplicationCache.markProcessed(payload.event_id);
      }

      const event = payload.event;
      const duration = Date.now() - startTime;
      console.log(`Event acknowledged in ${duration}ms, processing in background...`);

      // Process event in background (don't await)
      setImmediate(async () => {
        try {
          if (event.type === 'message') {
            await handleMessageEvent(event as MessageEvent);
          } else if (event.type === 'app_mention') {
            await handleAppMentionEvent(event as AppMentionEvent);
          } else {
            console.log(`Unhandled event type: ${event.type}`);
          }
        } catch (error) {
          console.error('Error processing event in background:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error handling Slack event:', error);

    // Try to acknowledge even on error if we haven't responded yet
    const duration = Date.now() - startTime;
    if (duration < 3000 && !res.headersSent) {
      res.status(200).send();
    }
  }
});

/**
 * POST /api/v1/slack/commands
 * Handles Slack slash commands (/explain, /setprofile, /help)
 * Validates requests, routes to appropriate handler, and acknowledges within 3 seconds
 */
router.post(
  '/commands',
  slackSignatureVerificationMiddleware(new SecretsService()),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Parse command payload from URL-encoded body
      const payload: SlackCommandPayload = {
        token: req.body.token,
        team_id: req.body.team_id,
        team_domain: req.body.team_domain,
        channel_id: req.body.channel_id,
        channel_name: req.body.channel_name,
        user_id: req.body.user_id,
        user_name: req.body.user_name,
        command: req.body.command,
        text: req.body.text || '',
        response_url: req.body.response_url,
        trigger_id: req.body.trigger_id,
        api_app_id: req.body.api_app_id,
        thread_ts: req.body.thread_ts,
      };

      console.log(`Received slash command: ${payload.command} from user ${payload.user_id}`);

      // Validate command
      const validation = await validateCommand(payload);
      if (!validation.valid) {
        res.status(200).json({
          response_type: 'ephemeral',
          text: `:x: ${validation.error}`,
        });
        return;
      }

      // Route to appropriate command handler
      let response;

      switch (payload.command) {
        case '/help':
          response = await handleHelpCommand();
          break;

        case '/setprofile':
          response = await handleSetProfileCommand(payload);
          break;

        case '/explain':
          response = await handleExplainCommand(payload);
          break;

        default:
          response = {
            response_type: 'ephemeral',
            text: `:x: Unknown command: ${payload.command}\n\nUse \`/help\` to see available commands.`,
          };
          break;
      }

      const duration = Date.now() - startTime;
      console.log(`Command ${payload.command} handled in ${duration}ms`);

      // Acknowledge command with response (must be within 3 seconds)
      res.status(200).json(response);
    } catch (error) {
      console.error('Error handling Slack command:', error);

      // Ensure we respond within 3 seconds even on error
      const duration = Date.now() - startTime;
      if (duration < 3000) {
        res.status(200).json({
          response_type: 'ephemeral',
          text: ':x: An error occurred while processing your command. Please try again.',
        });
      } else {
        // If we've exceeded 3 seconds, just log (Slack will show timeout to user)
        console.error('Command processing exceeded 3-second timeout');
      }
    }
  }
);

/**
 * POST /api/v1/slack/interactivity
 * Handles interactive components (buttons, modals, etc.)
 * Processes button clicks for Share, Feedback, and Ask More actions
 */
router.post(
  '/interactivity',
  slackSignatureVerificationMiddleware(new SecretsService()),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Parse payload from URL-encoded body
      const payloadString = req.body.payload;

      if (!payloadString) {
        res.status(400).json({
          error: 'Missing payload',
          message: 'Interactive payload is required',
        });
        return;
      }

      const payload = JSON.parse(payloadString) as InteractivePayload;

      console.log(`Received interactive payload: type=${payload.type}`);

      // Acknowledge immediately
      res.status(200).send();

      const duration = Date.now() - startTime;
      console.log(`Interactivity acknowledged in ${duration}ms, processing in background...`);

      // Process interaction in background (don't await)
      setImmediate(async () => {
        try {
          await handleInteractivePayload(payload);
        } catch (error) {
          console.error('Error processing interactive payload in background:', error);
        }
      });
    } catch (error) {
      console.error('Error handling Slack interactivity:', error);

      // Try to acknowledge even on error if we haven't responded yet
      const duration = Date.now() - startTime;
      if (duration < 3000 && !res.headersSent) {
        res.status(200).send();
      }
    }
  }
);

export default router;
