/**
 * Interactivity Handler
 * Handles button clicks and other interactive component actions
 */

import { InteractivePayload, BlockAction } from './types.js';
import { getPrismaClient } from '../database/client.js';

/**
 * Handle interactive payload
 * @param payload - Interactive payload from Slack
 */
export async function handleInteractivePayload(payload: InteractivePayload): Promise<void> {
  try {
    if (payload.type === 'block_actions' && payload.actions) {
      for (const action of payload.actions) {
        await handleBlockAction(action, payload);
      }
    }
  } catch (error) {
    console.error('Error handling interactive payload:', error);
    throw error;
  }
}

/**
 * Handle block action (button click)
 * @param action - Block action
 * @param payload - Full interactive payload
 */
async function handleBlockAction(
  action: BlockAction,
  payload: InteractivePayload
): Promise<void> {
  const actionId = action.action_id;

  console.log(`Processing block action: ${actionId}`);

  switch (actionId) {
    case 'feedback_thumbs_up':
      await handleFeedbackAction(action, payload, 'thumbs_up');
      break;

    case 'feedback_thumbs_down':
      await handleFeedbackAction(action, payload, 'thumbs_down');
      break;

    case 'share_translation':
      await handleShareAction(payload);
      break;

    case 'ask_more':
      await handleAskMoreAction(payload);
      break;

    case 'trigger_explain':
      await handleTriggerExplainAction(action, payload);
      break;

    case 'trigger_setprofile':
      await handleTriggerSetProfileAction(payload);
      break;

    default:
      console.log(`Unknown action ID: ${actionId}`);
  }
}

/**
 * Handle feedback button click (thumbs up/down)
 * @param action - Block action
 * @param payload - Interactive payload
 * @param rating - Feedback rating (thumbs_up or thumbs_down)
 */
async function handleFeedbackAction(
  action: BlockAction,
  payload: InteractivePayload,
  rating: 'thumbs_up' | 'thumbs_down'
): Promise<void> {
  try {
    const translationId = action.value;
    const userId = payload.user.id;

    if (!translationId) {
      console.error('No translation ID in feedback action');
      return;
    }

    console.log(`Recording ${rating} feedback for translation ${translationId}`);

    const prisma = getPrismaClient();

    // Get or create user
    const user = await prisma.user.upsert({
      where: { slackUserId: userId },
      update: {},
      create: {
        slackUserId: userId,
        slackWorkspaceId: payload.user.username || 'unknown',
        role: 'Engineering_Backend', // Default role
        language: 'English',
      },
    });

    // Create or update feedback using composite unique key
    await prisma.userFeedback.upsert({
      where: {
        translationId_userId: {
          translationId: translationId,
          userId: user.id,
        },
      },
      update: {
        rating: rating,
      },
      create: {
        translationId: translationId,
        userId: user.id,
        rating: rating,
      },
    });

    console.log(`Feedback saved: ${rating} from user ${userId}`);

    // Send acknowledgment via response_url if available
    if (payload.response_url) {
      const message =
        rating === 'thumbs_up'
          ? 'Thanks for the positive feedback!'
          : "Thanks for the feedback. We'll work on improving!";

      await fetch(payload.response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          replace_original: false,
          response_type: 'ephemeral',
        }),
      });
    }
  } catch (error) {
    console.error('Error handling feedback action:', error);
    throw error;
  }
}

/**
 * Handle share button click (convert ephemeral to in_channel)
 * @param payload - Interactive payload
 */
async function handleShareAction(payload: InteractivePayload): Promise<void> {
  try {
    console.log('Handling share translation action');

    if (!payload.response_url) {
      console.error('No response_url in payload for share action');
      return;
    }

    // Update the message to be visible to everyone
    await fetch(payload.response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'in_channel',
        replace_original: true,
        text: 'Translation shared with channel',
      }),
    });

    console.log('Translation shared successfully');
  } catch (error) {
    console.error('Error handling share action:', error);
    throw error;
  }
}

/**
 * Handle "Ask More" button click
 * @param payload - Interactive payload
 */
async function handleAskMoreAction(payload: InteractivePayload): Promise<void> {
  try {
    console.log('Handling ask more action');

    if (!payload.response_url) {
      console.error('No response_url in payload for ask more action');
      return;
    }

    // Send prompt for follow-up question
    await fetch(payload.response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'To ask a follow-up question, please use the `/explain` command again in the thread.',
        response_type: 'ephemeral',
        replace_original: false,
      }),
    });

    console.log('Ask more prompt sent');
  } catch (error) {
    console.error('Error handling ask more action:', error);
    throw error;
  }
}

/**
 * Handle trigger explain button (from app_mention)
 * @param action - Block action
 * @param payload - Interactive payload
 */
async function handleTriggerExplainAction(
  action: BlockAction,
  payload: InteractivePayload
): Promise<void> {
  try {
    console.log('Handling trigger explain action');

    if (!payload.response_url) {
      console.error('No response_url in payload');
      return;
    }

    // Parse action value to get channel and thread info
    const actionData = action.value ? JSON.parse(action.value) : {};
    const threadTs = actionData.thread_ts || payload.message?.thread_ts;

    // Send message suggesting to use /explain command
    await fetch(payload.response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Please use the \`/explain\` command ${threadTs ? 'in this thread' : 'in the channel'} to get an explanation.`,
        response_type: 'ephemeral',
        replace_original: false,
      }),
    });

    console.log('Trigger explain prompt sent');
  } catch (error) {
    console.error('Error handling trigger explain action:', error);
    throw error;
  }
}

/**
 * Handle trigger set profile button (from app_mention)
 * @param payload - Interactive payload
 */
async function handleTriggerSetProfileAction(payload: InteractivePayload): Promise<void> {
  try {
    console.log('Handling trigger setprofile action');

    if (!payload.response_url) {
      console.error('No response_url in payload');
      return;
    }

    // Send message suggesting to use /setprofile command
    await fetch(payload.response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Please use the `/setprofile` command to set up your profile and preferences.',
        response_type: 'ephemeral',
        replace_original: false,
      }),
    });

    console.log('Trigger setprofile prompt sent');
  } catch (error) {
    console.error('Error handling trigger setprofile action:', error);
    throw error;
  }
}
