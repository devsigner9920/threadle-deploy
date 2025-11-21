/**
 * Timeout Handling for LLM Requests
 * Prevents hanging requests by enforcing maximum execution time
 */

import { TimeoutError } from './types.js';

/**
 * Wrap a promise with a timeout
 * Aborts the promise if it doesn't resolve within the specified time
 *
 * @param promise - Promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param provider - Provider name for error messages
 * @returns Promise that rejects with TimeoutError if timeout exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: string
): Promise<T> {
  // Create a timeout promise that rejects after timeoutMs
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(provider, timeoutMs));
    }, timeoutMs);
  });

  // Race between the actual promise and the timeout
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Create an abort controller that automatically aborts after timeout
 * Useful for fetch requests that support AbortSignal
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with AbortSignal and cleanup function
 */
export function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}
