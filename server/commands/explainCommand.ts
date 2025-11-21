/**
 * /explain Command Handler
 * Fetches thread context and queues translation job for background processing
 */

import { SlackCommandPayload, SlackCommandResponse } from './types.js';
import { SlackClient } from '../slack/slackClient.js';
import { SecretsService } from '../config/index.js';

/**
 * Parse command text to check for 'public' flag
 * @param text - Command text from payload
 * @returns true if public flag is present
 */
function isPublicRequest(text: string): boolean {
  const lowerText = text.trim().toLowerCase();
  return lowerText === 'public' || lowerText.includes('public');
}

/**
 * Handle /explain slash command
 * @param payload - Slack command payload
 * @returns Command response
 */
export async function handleExplainCommand(
  payload: SlackCommandPayload
): Promise<SlackCommandResponse> {
  try {
    // Parse command flags
    const isPublic = isPublicRequest(payload.text);
    const responseType = isPublic ? 'in_channel' : 'ephemeral';

    // Initialize Slack client
    const secretsService = new SecretsService();
    const slackClient = new SlackClient(secretsService);

    // Determine if command was invoked in a thread
    const threadTs = payload.thread_ts;
    const channelId = payload.channel_id;

    let messages: any[] = [];
    let contextDescription = '';

    if (threadTs) {
      // Fetch thread messages using conversations.replies API
      try {
        messages = await slackClient.getThreadMessages(channelId, threadTs);
        contextDescription = `thread with ${messages.length} message(s)`;
      } catch (error) {
        console.error('Error fetching thread messages:', error);
        return {
          response_type: 'ephemeral',
          text: ':x: Failed to fetch thread messages. Please ensure the bot has access to this channel.',
        };
      }
    } else {
      // Not in a thread - fetch recent channel messages (last 10)
      try {
        // Use conversations.history to get recent messages
        const result = await (slackClient as any).client.conversations.history({
          channel: channelId,
          limit: 10,
        });

        if (result.ok && result.messages) {
          messages = result.messages;
          contextDescription = `last ${messages.length} message(s) in channel`;
        }
      } catch (error) {
        console.error('Error fetching channel messages:', error);
        return {
          response_type: 'ephemeral',
          text: ':x: Failed to fetch channel messages. Please ensure the bot has access to this channel.',
        };
      }
    }

    // Validate we have messages to translate
    if (messages.length === 0) {
      return {
        response_type: 'ephemeral',
        text: ':warning: No messages found to translate. Please use this command in a channel with messages or within a thread.',
      };
    }

    // TODO: Queue translation job for background processing
    // This will be implemented in Task Group 8 (LLM Integration)
    // For now, return a placeholder message

    const placeholderText = isPublic
      ? `:hourglass_flowing_sand: Generating explanation for ${contextDescription}... (This will be updated with the translation shortly)`
      : `:hourglass_flowing_sand: Generating your personal explanation for ${contextDescription}...\n\n_This is a private message visible only to you. The translation will be updated shortly._`;

    // Log for debugging
    console.log(`/explain command from user ${payload.user_id} in channel ${channelId}`);
    console.log(`Context: ${contextDescription}, Public: ${isPublic}`);
    console.log(`Messages to translate: ${messages.length}`);
    console.log(`Response URL for updates: ${payload.response_url}`);

    // Return placeholder response
    // The actual translation will be sent via response_url in background job
    return {
      response_type: responseType,
      text: placeholderText,
      ...(threadTs && { thread_ts: threadTs }), // Reply in same thread if applicable
    };
  } catch (error) {
    console.error('Error handling /explain command:', error);

    return {
      response_type: 'ephemeral',
      text: ':x: An error occurred while processing your request. Please try again or contact your workspace admin.',
    };
  }
}

/**
 * Validate invocation context
 * @param channelId - Channel ID where command was invoked
 * @returns Validation result with error message if invalid
 */
export async function validateContext(
  channelId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if bot is in the channel
    const secretsService = new SecretsService();
    const slackClient = new SlackClient(secretsService);

    await slackClient.getChannel(channelId);

    return { valid: true };
  } catch (error) {
    console.error('Error validating channel context:', error);
    return {
      valid: false,
      error: 'Bot does not have access to this channel. Please invite the bot first.',
    };
  }
}
