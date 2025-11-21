/**
 * Retry Logic with Exponential Backoff
 * Handles transient failures for LLM API calls
 */

import { RateLimitError, LLMError } from './types.js';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * Default: 1000ms (1 second)
   */
  initialDelay?: number;

  /**
   * Provider name for logging
   */
  provider: string;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'provider'>> = {
  maxRetries: 3,
  initialDelay: 1000,
};

/**
 * Retry an async operation with exponential backoff
 * Retries on 429 (rate limit) and 500+ (server error) status codes
 *
 * Backoff sequence: 1s, 2s, 4s (exponential: delay * 2^attempt)
 *
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = isRetryableError(error);

      if (!shouldRetry || attempt >= config.maxRetries) {
        // Don't retry or max retries reached
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = config.initialDelay * Math.pow(2, attempt);

      // Log retry attempt
      console.warn(
        `LLM request to ${config.provider} failed (attempt ${attempt + 1}/${config.maxRetries + 1}). ` +
        `Retrying in ${delay}ms...`,
        {
          provider: config.provider,
          error: error.message,
          statusCode: error.statusCode,
        }
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Determine if an error is retryable
 * Retries on:
 * - Rate limit errors (429)
 * - Server errors (500+)
 *
 * Does NOT retry on:
 * - Authentication errors (401)
 * - Client errors (400-499 except 429)
 * - Timeout errors (handled separately)
 *
 * @param error - Error to check
 * @returns true if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors are retryable
  if (error instanceof RateLimitError) {
    return true;
  }

  // LLM errors with retryable status codes
  if (error instanceof LLMError) {
    const statusCode = error.statusCode;
    if (statusCode) {
      // Retry on server errors (500+)
      if (statusCode >= 500) {
        return true;
      }
      // Retry on rate limit (429)
      if (statusCode === 429) {
        return true;
      }
    }
  }

  // Network errors (no status code) are retryable
  if (!error.statusCode && error.code !== 'TIMEOUT') {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
