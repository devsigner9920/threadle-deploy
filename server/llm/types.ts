/**
 * LLM Provider Types and Interfaces
 * Defines the common interface for all LLM providers (OpenAI, Anthropic, Google)
 */

/**
 * Completion options for LLM requests
 */
export interface CompletionOptions {
  /**
   * Temperature controls randomness (0.0 = deterministic, 1.0 = creative)
   * Lower temperature (0.3-0.5) for factual translation
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate in the response
   */
  maxTokens?: number;

  /**
   * Model identifier (e.g., 'gpt-4', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro')
   */
  model?: string;
}

/**
 * Token usage information from LLM response
 */
export interface TokenUsage {
  /**
   * Number of tokens in the prompt
   */
  promptTokens: number;

  /**
   * Number of tokens in the completion/response
   */
  completionTokens: number;

  /**
   * Total tokens used (prompt + completion)
   */
  totalTokens: number;
}

/**
 * Standardized response from LLM provider
 */
export interface LLMResponse {
  /**
   * Generated content/completion text
   */
  content: string;

  /**
   * Token usage statistics
   */
  usage: TokenUsage;

  /**
   * Provider name that generated this response
   */
  provider: string;

  /**
   * Model identifier used for this response
   */
  model: string;
}

/**
 * Common interface that all LLM providers must implement
 * Ensures consistent API across OpenAI, Anthropic, and Google
 */
export interface LLMProvider {
  /**
   * Complete a prompt with the LLM
   * @param prompt - Input prompt text
   * @param options - Completion options (temperature, maxTokens, model)
   * @returns Promise resolving to LLM response
   */
  complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse>;

  /**
   * Test the connection to the LLM provider
   * Validates API key and connectivity
   * @returns Promise resolving to true if connection successful
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the provider name
   * @returns Provider identifier (e.g., 'openai', 'anthropic', 'google')
   */
  getProviderName(): string;
}

/**
 * Error types for LLM operations
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends LLMError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      provider,
      429
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error (invalid API key)
 */
export class AuthenticationError extends LLMError {
  constructor(provider: string) {
    super(`Invalid API key for ${provider}`, provider, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends LLMError {
  constructor(provider: string, timeoutMs: number) {
    super(`Request to ${provider} timed out after ${timeoutMs}ms`, provider);
    this.name = 'TimeoutError';
  }
}
