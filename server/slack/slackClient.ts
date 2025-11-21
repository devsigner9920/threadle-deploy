/**
 * Slack API Client Wrapper
 * Provides a clean interface for interacting with Slack Web API
 * with built-in error handling, rate limiting, and logging.
 */

import { WebClient, WebAPICallResult, ErrorCode } from '@slack/web-api';
import { SecretsService } from '../config/index.js';

/**
 * Interface for Slack user info
 */
export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    email?: string;
    title?: string;
    display_name?: string;
  };
}

/**
 * Interface for Slack channel info
 */
export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
}

/**
 * Slack API Client wrapper class
 */
export class SlackClient {
  private client: WebClient;
  private botToken: string;
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
  };

  /**
   * Create a new SlackClient instance
   * @param secretsService - Secrets service to retrieve bot token
   */
  constructor(secretsService: SecretsService) {
    // Get bot token from secrets
    const token = secretsService.getSecret('slackBotToken');

    if (!token) {
      throw new Error('Slack bot token not configured');
    }

    this.botToken = token;

    // Determine log level from environment variable
    const logLevelEnv = process.env['SLACK_LOG_LEVEL'];

    // Initialize Web API client
    this.client = new WebClient(this.botToken, {
      logLevel: logLevelEnv as any || undefined,
    });
  }

  /**
   * Get user information by user ID
   * @param userId - Slack user ID
   * @returns User information
   */
  async getUser(userId: string): Promise<SlackUser> {
    try {
      console.log(`Slack API: Fetching user info for ${userId}`);

      const result = await this.retryWithBackoff(() =>
        this.client.users.info({ user: userId })
      );

      if (!result.ok || !result.user) {
        throw new Error(`Failed to fetch user: ${userId}`);
      }

      return result.user as SlackUser;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get channel information by channel ID
   * @param channelId - Slack channel ID
   * @returns Channel information
   */
  async getChannel(channelId: string): Promise<SlackChannel> {
    try {
      console.log(`Slack API: Fetching channel info for ${channelId}`);

      const result = await this.retryWithBackoff(() =>
        this.client.conversations.info({ channel: channelId })
      );

      if (!result.ok || !result.channel) {
        throw new Error(`Failed to fetch channel: ${channelId}`);
      }

      return result.channel as SlackChannel;
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Post a message to a channel
   * @param channelId - Channel ID to post to
   * @param text - Message text
   * @param options - Additional message options
   * @returns Message timestamp
   */
  async postMessage(
    channelId: string,
    text: string,
    options?: {
      thread_ts?: string;
      blocks?: any[];
      attachments?: any[];
    }
  ): Promise<string> {
    try {
      console.log(`Slack API: Posting message to ${channelId}`);

      const result = await this.retryWithBackoff(() =>
        this.client.chat.postMessage({
          channel: channelId,
          text,
          ...options,
        })
      );

      if (!result.ok || !result.ts) {
        throw new Error(`Failed to post message to ${channelId}`);
      }

      return result.ts;
    } catch (error) {
      console.error(`Error posting message to ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Post an ephemeral message (visible only to specific user)
   * @param channelId - Channel ID to post to
   * @param userId - User ID who will see the message
   * @param text - Message text
   * @param options - Additional message options
   * @returns Message timestamp
   */
  async postEphemeral(
    channelId: string,
    userId: string,
    text: string,
    options?: {
      thread_ts?: string;
      blocks?: any[];
      attachments?: any[];
    }
  ): Promise<string> {
    try {
      console.log(`Slack API: Posting ephemeral message to ${channelId} for user ${userId}`);

      const result = await this.retryWithBackoff(() =>
        this.client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text,
          ...options,
        })
      );

      if (!result.ok || !result.message_ts) {
        throw new Error(`Failed to post ephemeral message to ${channelId}`);
      }

      return result.message_ts;
    } catch (error) {
      console.error(`Error posting ephemeral message to ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch thread messages from a channel
   * @param channelId - Channel ID
   * @param threadTs - Thread timestamp
   * @returns Array of messages in thread
   */
  async getThreadMessages(
    channelId: string,
    threadTs: string
  ): Promise<any[]> {
    try {
      console.log(`Slack API: Fetching thread ${threadTs} from ${channelId}`);

      const result = await this.retryWithBackoff(() =>
        this.client.conversations.replies({
          channel: channelId,
          ts: threadTs,
        })
      );

      if (!result.ok || !result.messages) {
        throw new Error(`Failed to fetch thread ${threadTs} from ${channelId}`);
      }

      return result.messages;
    } catch (error) {
      console.error(`Error fetching thread ${threadTs}:`, error);
      throw error;
    }
  }

  /**
   * Retry API call with exponential backoff for rate limiting
   * @param apiCall - Function that makes the API call
   * @returns API call result
   * @private
   */
  private async retryWithBackoff<T extends WebAPICallResult>(
    apiCall: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error (429)
        if (error.code === ErrorCode.RateLimitedError) {
          const retryAfter = error.retryAfter || this.retryConfig.retryDelay;
          const delay = retryAfter * 1000; // Convert to milliseconds

          console.warn(
            `Rate limited by Slack API. Retrying after ${retryAfter} seconds...`
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors, apply exponential backoff
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
          console.warn(
            `API call failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries}). Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Max retries reached
        throw error;
      }
    }

    // Should never reach here, but TypeScript requires it
    throw lastError || new Error('Unknown error in retry logic');
  }

  /**
   * Get the bot token (for testing purposes)
   */
  get token(): string {
    return this.botToken;
  }
}

/**
 * Factory function to create a Slack client
 * @param secretsService - Secrets service instance
 * @returns SlackClient instance
 */
export function createSlackClient(secretsService: SecretsService): SlackClient {
  return new SlackClient(secretsService);
}
