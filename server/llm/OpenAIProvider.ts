/**
 * OpenAI Provider Implementation
 * Implements LLM provider interface using OpenAI API
 */

import OpenAI from 'openai';
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
 * Default configuration for OpenAI
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4',
  temperature: 0.3,
  maxTokens: 1000,
  timeout: 30000, // 30 seconds
};

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private readonly providerName = 'openai';

  /**
   * Create a new OpenAI provider instance
   * @param apiKey - OpenAI API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
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
   * Complete a prompt using OpenAI
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
        const completion = await this.client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        });

        // Extract response content
        const content = completion.choices[0]?.message?.content || '';

        // Extract token usage
        const usage = {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        };

        return {
          content,
          usage,
          provider: this.providerName,
          model: completion.model,
        };
      } catch (error: any) {
        // Handle OpenAI-specific errors
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
   * Test connection to OpenAI API
   * Makes a minimal API call to verify credentials
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Make a minimal API call to test the connection
      await this.client.chat.completions.create({
        model: DEFAULT_CONFIG.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });

      return true;
    } catch (error: any) {
      console.error('OpenAI connection test failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle OpenAI API errors and convert to standardized error types
   * @param error - Original error from OpenAI SDK
   * @returns Standardized LLMError
   * @private
   */
  private handleError(error: any): Error {
    const status = error?.status || error?.response?.status;
    const message = error?.message || 'Unknown OpenAI error';

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
        `OpenAI server error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Client errors (400+)
    if (status >= 400) {
      return new LLMError(
        `OpenAI client error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Generic error
    return new LLMError(
      `OpenAI error: ${message}`,
      this.providerName,
      undefined,
      error
    );
  }
}
