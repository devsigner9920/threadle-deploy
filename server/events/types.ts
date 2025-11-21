/**
 * Slack Event Types
 * Type definitions for Slack Events API payloads
 */

/**
 * Slack event payload wrapper
 */
export interface SlackEventPayload {
  type: 'url_verification' | 'event_callback';
  token?: string;
  challenge?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  event_id?: string;
  event_time?: number;
}

/**
 * Slack event types
 */
export interface SlackEvent {
  type: 'message' | 'app_mention';
  channel: string;
  user?: string;
  bot_id?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  event_ts?: string;
}

/**
 * Message event specific fields
 */
export interface MessageEvent extends SlackEvent {
  type: 'message';
  subtype?: string;
}

/**
 * App mention event specific fields
 */
export interface AppMentionEvent extends SlackEvent {
  type: 'app_mention';
}

/**
 * Interactive component action
 */
export interface BlockAction {
  action_id: string;
  block_id: string;
  value?: string;
  text?: {
    type: string;
    text: string;
  };
}

/**
 * Interactive payload
 */
export interface InteractivePayload {
  type: 'block_actions' | 'view_submission';
  user: {
    id: string;
    username?: string;
    name?: string;
  };
  actions?: BlockAction[];
  response_url?: string;
  trigger_id?: string;
  channel?: {
    id: string;
    name?: string;
  };
  message?: {
    ts: string;
    thread_ts?: string;
  };
}
