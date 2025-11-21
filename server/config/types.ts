/**
 * Configuration Types for Threadle
 * Defines type-safe configuration schema for application settings
 */

/**
 * LLM Provider options
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google';

/**
 * Translation style options
 */
export type TranslationStyle = 'ELI5' | 'Business Summary' | 'Technical Lite' | 'Analogies Only';

/**
 * Supported languages
 */
export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Japanese' | 'Korean' | 'Chinese';

/**
 * Main application configuration schema
 * Stored in ~/.threadle/config.json
 */
export interface AppConfig {
  /**
   * Whether the setup wizard has been completed
   */
  setupCompleted: boolean;

  /**
   * Server port (default: 3000)
   * Can be overridden by THREADLE_PORT env var
   */
  port: number;

  /**
   * Selected LLM provider
   * Can be overridden by THREADLE_LLM_PROVIDER env var
   */
  llmProvider: LLMProvider;

  /**
   * Slack App ID (from Slack App settings)
   */
  slackAppId?: string;

  /**
   * Slack Client ID (from Slack App settings)
   */
  slackClientId?: string;

  /**
   * Slack Workspace ID (populated after OAuth)
   */
  slackWorkspaceId?: string;

  /**
   * Default language for translations
   */
  defaultLanguage: Language;

  /**
   * Default translation style
   */
  defaultStyle: TranslationStyle;

  /**
   * Rate limit: requests per user per minute
   */
  rateLimitPerMinute: number;

  /**
   * Cache TTL in seconds (default: 3600 = 1 hour)
   */
  cacheTTL: number;

  /**
   * JWT secret for token signing
   * Used for web UI authentication
   */
  jwtSecret?: string;
}

/**
 * Sensitive secrets configuration
 * Stored encrypted in ~/.threadle/secrets.encrypted
 */
export interface SecretsConfig {
  /**
   * Slack Client Secret (from Slack App settings)
   * Can be overridden by THREADLE_SLACK_CLIENT_SECRET env var
   */
  slackClientSecret: string;

  /**
   * Slack Signing Secret (used to verify requests)
   * Can be overridden by THREADLE_SLACK_SIGNING_SECRET env var
   */
  slackSigningSecret: string;

  /**
   * Slack Bot Token (obtained after OAuth)
   * Can be overridden by THREADLE_SLACK_BOT_TOKEN env var
   */
  slackBotToken: string;

  /**
   * LLM API Key (OpenAI, Anthropic, or Google)
   * Can be overridden by THREADLE_LLM_API_KEY env var
   */
  llmApiKey: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  setupCompleted: false,
  port: 3000,
  llmProvider: 'openai',
  defaultLanguage: 'English',
  defaultStyle: 'ELI5',
  rateLimitPerMinute: 10,
  cacheTTL: 3600,
  jwtSecret: 'threadle-default-secret-change-in-production',
};

/**
 * Default secrets (empty)
 */
export const DEFAULT_SECRETS: SecretsConfig = {
  slackClientSecret: '',
  slackSigningSecret: '',
  slackBotToken: '',
  llmApiKey: '',
};

/**
 * Environment variable mapping
 */
export const ENV_VAR_MAPPING = {
  THREADLE_PORT: 'port',
  THREADLE_LLM_PROVIDER: 'llmProvider',
  THREADLE_SLACK_APP_ID: 'slackAppId',
  THREADLE_SLACK_CLIENT_ID: 'slackClientId',
  THREADLE_SLACK_WORKSPACE_ID: 'slackWorkspaceId',
  THREADLE_DEFAULT_LANGUAGE: 'defaultLanguage',
  THREADLE_DEFAULT_STYLE: 'defaultStyle',
  THREADLE_RATE_LIMIT_PER_MINUTE: 'rateLimitPerMinute',
  THREADLE_CACHE_TTL: 'cacheTTL',
  THREADLE_JWT_SECRET: 'jwtSecret',
} as const;

/**
 * Secrets environment variable mapping
 */
export const SECRETS_ENV_VAR_MAPPING = {
  THREADLE_SLACK_CLIENT_SECRET: 'slackClientSecret',
  THREADLE_SLACK_SIGNING_SECRET: 'slackSigningSecret',
  THREADLE_SLACK_BOT_TOKEN: 'slackBotToken',
  THREADLE_LLM_API_KEY: 'llmApiKey',
} as const;

/**
 * Valid LLM providers
 */
export const VALID_LLM_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'google'];

/**
 * Valid translation styles
 */
export const VALID_TRANSLATION_STYLES: TranslationStyle[] = [
  'ELI5',
  'Business Summary',
  'Technical Lite',
  'Analogies Only',
];

/**
 * Valid languages
 */
export const VALID_LANGUAGES: Language[] = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Chinese',
];
