/**
 * ConversationSummarizer - Summarizes long conversations to fit token limits
 */

import { ConversationMessage } from './types.js';
import { LLMProvider } from '../llm/types.js';

/**
 * ConversationSummarizer class - handles conversation summarization
 */
export class ConversationSummarizer {
  private readonly TOKEN_LIMIT = 2000;
  private readonly CHARS_PER_TOKEN = 4; // Rough estimate: 1 token ≈ 4 characters

  /**
   * Check if conversation exceeds token limit
   * @param conversation - Array of conversation messages
   * @param tokenLimit - Maximum allowed tokens (default: 2000)
   * @returns True if conversation exceeds limit
   */
  exceedsTokenLimit(conversation: ConversationMessage[], tokenLimit: number = this.TOKEN_LIMIT): boolean {
    const estimatedTokens = this.estimateTokenCount(conversation);
    return estimatedTokens > tokenLimit;
  }

  /**
   * Estimate token count for a conversation
   * Uses a simple heuristic: ~4 characters per token
   * @param conversation - Array of conversation messages
   * @returns Estimated token count
   */
  estimateTokenCount(conversation: ConversationMessage[]): number {
    const totalChars = conversation.reduce((sum, msg) => {
      return sum + msg.user.length + msg.text.length;
    }, 0);

    return Math.ceil(totalChars / this.CHARS_PER_TOKEN);
  }

  /**
   * Summarize a long conversation using an LLM
   * @param conversation - Array of conversation messages
   * @param llmProvider - LLM provider to use for summarization
   * @returns Summarized conversation as a single message
   */
  async summarize(
    conversation: ConversationMessage[],
    llmProvider: LLMProvider
  ): Promise<ConversationMessage> {
    // Build summarization prompt
    const prompt = this.buildSummarizationPrompt(conversation);

    // Call cheaper/faster model for summarization
    const response = await llmProvider.complete(prompt, {
      temperature: 0.3,
      maxTokens: 500,
      model: this.getCheaperModel(llmProvider.getProviderName()),
    });

    // Return as a single summarized message
    return {
      user: 'System Summary',
      text: response.content,
    };
  }

  /**
   * Build a prompt for conversation summarization
   * @param conversation - Array of conversation messages
   * @returns Summarization prompt
   * @private
   */
  private buildSummarizationPrompt(conversation: ConversationMessage[]): string {
    const conversationText = conversation
      .map((msg) => `${msg.user}: ${msg.text}`)
      .join('\n');

    return `Summarize the following conversation, preserving key information, decisions, and technical terms:

${conversationText}

Provide a concise summary that captures:
1. Main topics discussed
2. Key decisions made
3. Important technical terms and concepts
4. Action items or next steps

Keep the summary clear and factual.`;
  }

  /**
   * Get cheaper model name for summarization based on provider
   * @param providerName - LLM provider name
   * @returns Model name for cheaper/faster summarization
   * @private
   */
  private getCheaperModel(providerName: string): string {
    switch (providerName) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      case 'google':
        return 'gemini-1.5-flash';
      default:
        return ''; // Use default model
    }
  }

  /**
   * Truncate conversation to fit within token limit
   * Simple fallback: takes most recent messages
   * @param conversation - Array of conversation messages
   * @param tokenLimit - Maximum allowed tokens
   * @returns Truncated conversation
   */
  truncateConversation(
    conversation: ConversationMessage[],
    tokenLimit: number = this.TOKEN_LIMIT
  ): ConversationMessage[] {
    // Start from the end and work backwards
    const truncated: ConversationMessage[] = [];
    let currentTokens = 0;

    for (let i = conversation.length - 1; i >= 0; i--) {
      const msg = conversation[i];

      // Skip if message is undefined
      if (!msg) {
        continue;
      }

      const msgTokens = Math.ceil((msg.user.length + msg.text.length) / this.CHARS_PER_TOKEN);

      if (currentTokens + msgTokens <= tokenLimit) {
        truncated.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return truncated;
  }
}
