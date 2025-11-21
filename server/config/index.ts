/**
 * Configuration Module
 * Exports ConfigService and SecretsService for application-wide configuration management
 */

export { ConfigService } from './ConfigService.js';
export { SecretsService } from './SecretsService.js';
export type {
  AppConfig,
  SecretsConfig,
  LLMProvider,
  TranslationStyle,
  Language,
} from './types.js';
export {
  DEFAULT_CONFIG,
  DEFAULT_SECRETS,
  VALID_LLM_PROVIDERS,
  VALID_TRANSLATION_STYLES,
  VALID_LANGUAGES,
} from './types.js';
