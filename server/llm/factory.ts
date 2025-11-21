/**
 * LLM Provider Factory
 * Creates and manages LLM provider instances based on configuration
 */

import { ConfigService } from '../config/ConfigService.js';
import { SecretsService } from '../config/SecretsService.js';
import { LLMProvider } from './types.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GoogleProvider } from './GoogleProvider.js';
import { LLMProvider as LLMProviderType } from '../config/types.js';

/**
 * Singleton cache for provider instances
 * Prevents creating multiple instances of the same provider
 */
let providerCache: LLMProvider | null = null;
let cachedProviderType: LLMProviderType | null = null;

/**
 * Create an LLM provider instance based on configuration
 * Returns cached instance if provider type hasn't changed
 *
 * @param configService - Configuration service instance
 * @param secretsService - Secrets service instance
 * @returns LLM provider instance
 * @throws Error if API key not configured or invalid provider type
 */
export function createLLMProvider(
  configService: ConfigService,
  secretsService: SecretsService
): LLMProvider {
  // Get provider type from config (defaults to 'openai')
  const providerType = configService.get('llmProvider') || 'openai';

  // Return cached instance if provider type hasn't changed
  if (providerCache && cachedProviderType === providerType) {
    return providerCache;
  }

  // Get API key from secrets
  const apiKey = secretsService.getSecret('llmApiKey');

  if (!apiKey) {
    throw new Error('LLM API key not configured. Please complete setup wizard or set THREADLE_LLM_API_KEY environment variable.');
  }

  // Create provider instance based on type
  let provider: LLMProvider;

  switch (providerType) {
    case 'openai':
      provider = new OpenAIProvider(apiKey);
      break;

    case 'anthropic':
      provider = new AnthropicProvider(apiKey);
      break;

    case 'google':
      provider = new GoogleProvider(apiKey);
      break;

    default:
      console.warn(`Unknown LLM provider: ${providerType}. Defaulting to OpenAI.`);
      provider = new OpenAIProvider(apiKey);
      break;
  }

  // Cache the provider instance
  providerCache = provider;
  cachedProviderType = providerType;

  console.log(`LLM provider initialized: ${provider.getProviderName()}`);

  return provider;
}

/**
 * Clear the provider cache
 * Useful when configuration changes or for testing
 */
export function clearProviderCache(): void {
  providerCache = null;
  cachedProviderType = null;
}

/**
 * Get the currently cached provider (if any)
 * @returns Cached provider or null
 */
export function getCachedProvider(): LLMProvider | null {
  return providerCache;
}
