/**
 * App Mention Event Handler
 * Handles @mentions of the bot and provides helpful suggestions
 */

import { AppMentionEvent } from './types.js';
import { SlackClient } from '../slack/slackClient.js';
import { SecretsService } from '../config/index.js';

/**
 * Handle app_mention event
 * @param event - App mention event from Slack
 */
export async function handleAppMentionEvent(event: AppMentionEvent): Promise<void> {
  try {
    const channelId = event.channel;
    const userId = event.user;
    const threadTs = event.thread_ts || event.ts;

    if (!userId) {
      console.error('No user ID in app_mention event');
      return;
    }

    console.log(`Bot mentioned by user ${userId} in channel ${channelId}`);

    // Initialize Slack client
    const secretsService = new SecretsService();
    const slackClient = new SlackClient(secretsService);

    // Send helpful ephemeral message suggesting /explain command
    await slackClient.postEphemeral(
      channelId,
      userId,
      'Hi there! I can help you understand technical discussions.',
      {
        thread_ts: threadTs,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ":wave: Hi there! I'm Threadle, your cross-discipline translator.\n\nI can help you understand technical discussions in plain language.",
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "*Here's how to use me:*\n• Use `/explain` in any thread to get a personalized explanation\n• Use `/setprofile` to customize your role and preferences\n• Use `/help` for more information",
            },
          },
          {
            type: 'actions',
            block_id: 'app_mention_actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Explain this thread',
                },
                action_id: 'trigger_explain',
                value: JSON.stringify({
                  channel: channelId,
                  thread_ts: threadTs,
                }),
                style: 'primary',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Set up my profile',
                },
                action_id: 'trigger_setprofile',
                value: 'open_profile',
              },
            ],
          },
        ],
      }
    );

    console.log(`Sent helpful message to user ${userId}`);
  } catch (error) {
    console.error('Error handling app_mention event:', error);
    // Don't throw - we don't want to fail the event acknowledgment
  }
}
