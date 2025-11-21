/**
 * /setprofile Command Handler
 * Opens a modal for users to configure their profile and preferences
 */

import { SlackCommandPayload, SlackCommandResponse, SlackModalView } from './types.js';
import { WebClient } from '@slack/web-api';
import { SecretsService } from '../config/index.js';

/**
 * Create profile configuration modal view
 * @returns Slack modal view definition
 */
function createProfileModal(): SlackModalView {
  return {
    type: 'modal',
    callback_id: 'profile_modal_submit',
    title: {
      type: 'plain_text',
      text: 'Set Your Profile',
    },
    submit: {
      type: 'plain_text',
      text: 'Save',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Configure your profile to get personalized translations tailored to your role and preferences.',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'input',
        block_id: 'role_block',
        element: {
          type: 'static_select',
          action_id: 'role_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select your role',
          },
          options: [
            {
              text: { type: 'plain_text', text: 'Engineering - Backend' },
              value: 'Engineering_Backend',
            },
            {
              text: { type: 'plain_text', text: 'Engineering - Frontend' },
              value: 'Engineering_Frontend',
            },
            {
              text: { type: 'plain_text', text: 'Engineering - Mobile' },
              value: 'Engineering_Mobile',
            },
            {
              text: { type: 'plain_text', text: 'Design' },
              value: 'Design',
            },
            {
              text: { type: 'plain_text', text: 'Product Management' },
              value: 'Product',
            },
            {
              text: { type: 'plain_text', text: 'Marketing' },
              value: 'Marketing',
            },
            {
              text: { type: 'plain_text', text: 'QA / Testing' },
              value: 'QA',
            },
            {
              text: { type: 'plain_text', text: 'Data / Analytics' },
              value: 'Data',
            },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Your Role',
        },
      },
      {
        type: 'input',
        block_id: 'language_block',
        element: {
          type: 'static_select',
          action_id: 'language_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select your preferred language',
          },
          initial_option: {
            text: { type: 'plain_text', text: 'English' },
            value: 'English',
          },
          options: [
            { text: { type: 'plain_text', text: 'English' }, value: 'English' },
            { text: { type: 'plain_text', text: 'Spanish' }, value: 'Spanish' },
            { text: { type: 'plain_text', text: 'French' }, value: 'French' },
            { text: { type: 'plain_text', text: 'German' }, value: 'German' },
            { text: { type: 'plain_text', text: 'Japanese' }, value: 'Japanese' },
            { text: { type: 'plain_text', text: 'Korean' }, value: 'Korean' },
            { text: { type: 'plain_text', text: 'Chinese' }, value: 'Chinese' },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Preferred Language',
        },
      },
      {
        type: 'input',
        block_id: 'style_block',
        element: {
          type: 'radio_buttons',
          action_id: 'style_select',
          initial_option: {
            text: { type: 'plain_text', text: 'ELI5 (Explain Like I\'m 5)' },
            value: 'ELI5',
          },
          options: [
            {
              text: { type: 'plain_text', text: 'ELI5 (Explain Like I\'m 5)' },
              value: 'ELI5',
              description: { type: 'plain_text', text: 'Very simple explanations with analogies' },
            },
            {
              text: { type: 'plain_text', text: 'Business Summary' },
              value: 'Business Summary',
              description: { type: 'plain_text', text: 'Focus on business impact and outcomes' },
            },
            {
              text: { type: 'plain_text', text: 'Technical Lite' },
              value: 'Technical Lite',
              description: { type: 'plain_text', text: 'Some technical details, simplified' },
            },
            {
              text: { type: 'plain_text', text: 'Analogies Only' },
              value: 'Analogies Only',
              description: { type: 'plain_text', text: 'Explain using real-world comparisons' },
            },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Preferred Translation Style',
        },
      },
      {
        type: 'input',
        block_id: 'custom_instructions_block',
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'custom_instructions_input',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'e.g., "Focus on security implications" or "Avoid database terminology"',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Custom Instructions (Optional)',
        },
      },
    ],
  };
}

/**
 * Handle /setprofile slash command
 * @param payload - Slack command payload
 * @returns Command response
 */
export async function handleSetProfileCommand(
  payload: SlackCommandPayload
): Promise<SlackCommandResponse> {
  try {
    // Get bot token to make API calls
    const secretsService = new SecretsService();
    const botToken = secretsService.getSecret('slackBotToken');

    if (!botToken) {
      return {
        response_type: 'ephemeral',
        text: ':x: Configuration error: Bot token not found. Please contact your workspace admin.',
      };
    }

    // Initialize Slack Web API client
    const client = new WebClient(botToken);

    // Open modal using trigger_id
    const modal = createProfileModal();

    await client.views.open({
      trigger_id: payload.trigger_id,
      view: modal as any,
    });

    // Return empty response since modal is being opened
    // The modal submission will be handled separately via interactivity endpoint
    return {
      response_type: 'ephemeral',
      text: '', // Empty response, modal will handle the interaction
    };
  } catch (error) {
    console.error('Error opening profile modal:', error);

    return {
      response_type: 'ephemeral',
      text: ':x: Failed to open profile settings. Please try again or contact your workspace admin.',
    };
  }
}
