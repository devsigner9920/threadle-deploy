/**
 * Google Gemini Provider Implementation
 * Implements LLM provider interface using Google Generative AI API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Default configuration for Google Gemini
 */
const DEFAULT_CONFIG = {
  model: 'gemini-1.5-pro',
  temperature: 0.3,
  maxTokens: 1000,
  timeout: 30000, // 30 seconds
};

/**
 * Google provider implementation
 */
export class GoogleProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private readonly providerName = 'google';

  /**
   * Create a new Google provider instance
   * @param apiKey - Google API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google API key is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Complete a prompt using Google Gemini
   * @param prompt - Input prompt text
   * @param options - Completion options
   * @returns Promise resolving to LLM response
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    const modelName = options?.model || DEFAULT_CONFIG.model;
    const temperature = options?.temperature ?? DEFAULT_CONFIG.temperature;
    const maxTokens = options?.maxTokens || DEFAULT_CONFIG.maxTokens;

    // Wrap the API call with retry logic and timeout
    const makeRequest = async () => {
      try {
        const model = this.client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;

        // Extract response content
        const content = response.text();

        // Estimate token usage (Google doesn't always provide exact counts)
        // We use approximate calculation based on characters
        const promptTokens = Math.ceil(prompt.length / 4);
        const completionTokens = Math.ceil(content.length / 4);

        // Try to get actual token counts if available
        const usageMetadata = (response as any).usageMetadata;
        const usage = {
          promptTokens: usageMetadata?.promptTokenCount || promptTokens,
          completionTokens: usageMetadata?.candidatesTokenCount || completionTokens,
          totalTokens: usageMetadata?.totalTokenCount || (promptTokens + completionTokens),
        };

        return {
          content,
          usage,
          provider: this.providerName,
          model: modelName,
        };
      } catch (error: any) {
        // Handle Google-specific errors
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
   * Test connection to Google API
   * Makes a minimal API call to verify credentials
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({
        model: DEFAULT_CONFIG.model,
      });

      // Make a minimal API call to test the connection
      await model.generateContent('test');

      return true;
    } catch (error: any) {
      console.error('Google connection test failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle Google API errors and convert to standardized error types
   * @param error - Original error from Google SDK
   * @returns Standardized LLMError
   * @private
   */
  private handleError(error: any): Error {
    const status = error?.status || error?.response?.status;
    const message = error?.message || 'Unknown Google error';

    // Check for specific error codes in the error message
    if (message.includes('RESOURCE_EXHAUSTED') || status === 429) {
      return new RateLimitError(this.providerName);
    }

    // Authentication error
    if (message.includes('PERMISSION_DENIED') || message.includes('UNAUTHENTICATED') || status === 401 || status === 403) {
      return new AuthenticationError(this.providerName);
    }

    // Server errors (500+)
    if (status >= 500 || message.includes('INTERNAL')) {
      return new LLMError(
        `Google server error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Client errors (400+)
    if (status >= 400 || message.includes('INVALID_ARGUMENT')) {
      return new LLMError(
        `Google client error: ${message}`,
        this.providerName,
        status,
        error
      );
    }

    // Generic error
    return new LLMError(
      `Google error: ${message}`,
      this.providerName,
      undefined,
      error
    );
  }
}
