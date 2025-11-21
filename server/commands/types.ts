/**
 * Slash Command Types
 * Type definitions for Slack slash command payloads and responses
 */

/**
 * Slack slash command payload interface
 */
export interface SlackCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
  api_app_id?: string;
  thread_ts?: string;
}

/**
 * Slack command response interface
 */
export interface SlackCommandResponse {
  response_type?: 'ephemeral' | 'in_channel';
  text: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
}

/**
 * Slack Block Kit block interface (simplified)
 * Using any for maximum flexibility with Slack's Block Kit
 */
export interface SlackBlock {
  type: string;
  block_id?: string;
  text?: {
    type: string;
    text: string;
  };
  label?: {
    type: string;
    text: string;
  };
  element?: any;
  elements?: any[];
  fields?: any[];
  accessory?: any;
  optional?: boolean;
  [key: string]: any; // Allow additional properties
}

/**
 * Slack modal view interface
 */
export interface SlackModalView {
  type: 'modal';
  callback_id: string;
  title: {
    type: 'plain_text';
    text: string;
  };
  submit?: {
    type: 'plain_text';
    text: string;
  };
  close?: {
    type: 'plain_text';
    text: string;
  };
  blocks: any[]; // Use any[] for full Slack Block Kit compatibility
}

/**
 * Command handler function type
 */
export type CommandHandler = (
  payload: SlackCommandPayload
) => Promise<SlackCommandResponse>;
