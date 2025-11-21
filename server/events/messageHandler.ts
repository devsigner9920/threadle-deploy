/**
 * Message Event Handler
 * Handles message events from Slack and updates conversation metadata
 */

import { MessageEvent } from './types.js';
import { getPrismaClient } from '../database/client.js';

/**
 * Handle message event
 * @param event - Message event from Slack
 */
export async function handleMessageEvent(event: MessageEvent): Promise<void> {
  try {
    // Skip bot messages to prevent loops
    if (event.bot_id) {
      console.log('Skipping bot message to prevent loops');
      return;
    }

    // Skip message subtypes that we don't want to track
    // (e.g., message_changed, message_deleted, channel_join, etc.)
    if (event.subtype) {
      console.log(`Skipping message subtype: ${event.subtype}`);
      return;
    }

    // Extract message info
    const channelId = event.channel;
    const threadTs = event.thread_ts || event.ts; // Use thread_ts or fall back to message ts
    const messageTimestamp = new Date(parseFloat(event.ts) * 1000);

    console.log(`Processing message event: channel=${channelId}, thread=${threadTs}`);

    // Get Prisma client
    const prisma = getPrismaClient();

    // Upsert conversation record
    const conversation = await prisma.conversation.upsert({
      where: {
        slackChannelId_slackThreadTs: {
          slackChannelId: channelId,
          slackThreadTs: threadTs,
        },
      },
      update: {
        messageCount: {
          increment: 1,
        },
        lastMessageAt: messageTimestamp,
      },
      create: {
        slackChannelId: channelId,
        slackThreadTs: threadTs,
        messageCount: 1,
        firstMessageAt: messageTimestamp,
        lastMessageAt: messageTimestamp,
      },
    });

    console.log(
      `Conversation updated: id=${conversation.id}, messageCount=${conversation.messageCount}`
    );
  } catch (error) {
    console.error('Error handling message event:', error);
    // Don't throw - we don't want to fail the event acknowledgment
  }
}
