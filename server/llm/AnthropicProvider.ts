/**
 * Anthropic Claude Provider Implementation
 * Implements LLM provider interface using Anthropic API
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  CompletionOptions,
  LLMResponse,
  LLMError,
  RateLimitError,
  AuthenticationError,
} from './types.js';
import { withRetry } from './retry.js';
import { withTimeout } from './timeout.js';

/**
 * Default configuration for Anthropic Claude
 */
const DEFAULT_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.3,
  maxTokens: 1000,
  timeout: 30000, // 30 seconds
};

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private readonly providerName = 'anthropic';

  /**
   * Create a new Anthropic provider instance
   * @param apiKey - Anthropic API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Complete a prompt using Anthropic Claude
   * @param prompt - Input prompt text
   * @param options - Completion options
   * @returns Promise resolving to LLM response
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    const model = options?.model || DEFAULT_CONFIG.model;
    const temperature = options?.temperature ?? DEFAULT_CONFIG.temperature;
    const maxTokens = options?.maxTokens || DEFAULT_CONFIG.maxTokens;

    // Wrap the API call with retry logic and timeout
    const makeRequest = async () => {
      try {
        const message = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        // Extract response content
        const content = message.content
          .filter((block) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        // Map Anthropic token usage to common format
        const usage = {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        };

        return {
          content,
          usage,
          provider: this.providerName,
          model: message.model,
        };
      } catch (error: any) {
        // Handle Anthropic-specific errors
        throw this.handleError(error);
      }
    };

    // Apply timeout wrapper
    const requestWithTimeout = () => withTimeout(
      makeRequest(),
      DEFAULT_CONFIG.timeout,
      this.providerName
    );

    // Apply retry logic with exponential backoff
    return withRetry(requestWithTimeout, {
      maxRetries: 3,
      initialDelay: 1000,
      provider: this.providerName,
    });
  }

  /**
   * Test connection to Anthropic API
   * Makes a minimal API call to verify credentials
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Make a minimal API call to test the connection
      await this.client.messages.create({
        model: DEFAULT_CONFIG.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch (error: any) {
      console.error('Anthropic connection test failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle Anthropic API errors and convert to standardized error types
   * @param error - Original error from Anthropic SDK
   * @returns Standardized LLMError
   * @private
   */
  private handleError(error: any): Error {
    const status = error?.status || error?.response?.status;
    const message = error?.message || 'Unknown Anthropic error';

    // Rate limit error (429)
    if (status === 429) {
      const retryAfter = error?.headers?.['retry-after'];
      return new RateLimitError(this.providerName, retryAfter ? parseInt(retryAfter) : undefined);
    }

    // Authentication error (401)
    if (status === 401) {
      return new AuthenticationError(this.providerName);
    }

    // Server errors (500+)
    if (status >= 500) {
      return new LLMError(
        `Anthropic server error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Client errors (400+)
    if (status >= 400) {
      return new LLMError(
        `Anthropic client error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Generic error
    return new LLMError(
      `Anthropic error: ${message}`,
      this.providerName,
      undefined,
      error
    );
  }
}
