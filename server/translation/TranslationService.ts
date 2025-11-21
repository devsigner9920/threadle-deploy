/**
 * TranslationService - Main service for translating technical conversations
 */

import { ConfigService } from '../config/ConfigService.js';
import { SecretsService } from '../config/SecretsService.js';
import { createLLMProvider } from '../llm/factory.js';
import { LLMProvider } from '../llm/types.js';
import { getPrismaClient } from '../database/client.js';
import { PromptBuilder } from './PromptBuilder.js';
import { PIIRedactor } from './PIIRedactor.js';
import { ConversationSummarizer } from './ConversationSummarizer.js';
import { CacheService, generateCacheKey } from '../cache/index.js';
import {
  ConversationMessage,
  UserProfile,
  TranslationResult,
  AI_DISCLAIMER,
} from './types.js';

/**
 * TranslationService class - orchestrates translation workflow with caching
 */
export class TranslationService {
  private configService: ConfigService;
  private llmProvider: LLMProvider;
  private promptBuilder: PromptBuilder;
  private piiRedactor: PIIRedactor;
  private conversationSummarizer: ConversationSummarizer;
  private cacheService: CacheService;
  private prisma: ReturnType<typeof getPrismaClient>;

  /**
   * Create a new TranslationService instance
   * @param configService - Configuration service
   * @param secretsService - Secrets service
   * @param cacheService - Optional cache service (creates new one if not provided)
   */
  constructor(
    configService: ConfigService,
    secretsService: SecretsService,
    cacheService?: CacheService
  ) {
    this.configService = configService;

    // Initialize LLM provider
    this.llmProvider = createLLMProvider(configService, secretsService);

    // Initialize components
    this.promptBuilder = new PromptBuilder();
    this.piiRedactor = new PIIRedactor();
    this.conversationSummarizer = new ConversationSummarizer();
    this.cacheService = cacheService || new CacheService();
    this.prisma = getPrismaClient();
  }

  /**
   * Translate a conversation for a specific user
   * @param conversationId - Database ID of the conversation
   * @param userId - Database ID of the user requesting translation
   * @returns Translation result with formatted content
   */
  async translate(conversationId: string, userId: string): Promise<TranslationResult> {
    // Fetch user profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Fetch conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Fetch conversation messages (stored in Translation.originalMessages or fetch from Slack)
    // For now, we'll assume messages are provided separately
    // In a real implementation, this would fetch from Slack API
    const messages: ConversationMessage[] = [
      // Placeholder - in real implementation, fetch from Slack
    ];

    // Prepare user profile
    const userProfile: UserProfile = {
      role: user.role,
      language: user.language,
      customInstructions: user.customInstructions,
      preferredStyle: user.preferredStyle,
    };

    // Determine translation style
    const style = user.preferredStyle || this.configService.get('defaultStyle') || 'ELI5';

    // Process the translation
    return this.processTranslation(
      conversationId,
      userId,
      userProfile,
      messages,
      style
    );
  }

  /**
   * Process translation with all the steps, including cache check
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @param userProfile - User profile
   * @param messages - Conversation messages
   * @param style - Translation style
   * @returns Translation result
   * @private
   */
  private async processTranslation(
    conversationId: string,
    userId: string,
    userProfile: UserProfile,
    messages: ConversationMessage[],
    style: string
  ): Promise<TranslationResult> {
    // Step 1: Generate cache key
    const cacheKey = generateCacheKey(
      messages,
      userProfile.role,
      userProfile.language,
      style
    );

    // Step 2: Check cache first
    const cached = await this.cacheService.get<TranslationResult>(cacheKey);
    if (cached) {
      console.log('[TranslationService] Cache hit - returning cached translation');
      return cached;
    }

    console.log('[TranslationService] Cache miss - generating new translation');

    // Step 3: Redact PII from messages
    const redactedMessages = this.redactPIIFromMessages(messages);

    // Step 4: Check if conversation needs summarization
    let processedMessages = redactedMessages;
    if (this.conversationSummarizer.exceedsTokenLimit(redactedMessages)) {
      console.log('[TranslationService] Conversation exceeds token limit, summarizing...');
      const summary = await this.conversationSummarizer.summarize(
        redactedMessages,
        this.llmProvider
      );
      processedMessages = [summary];
    }

    // Step 5: Build prompt using PromptBuilder
    const prompt = this.promptBuilder.buildPrompt(userProfile, processedMessages, style);

    // Step 6: Call LLM for translation
    const llmResponse = await this.llmProvider.complete(prompt, {
      temperature: 0.4,
      maxTokens: 1000,
    });

    // Step 7: Add AI disclaimer
    const contentWithDisclaimer = this.addDisclaimer(llmResponse.content);

    // Step 8: Create result
    const result: TranslationResult = {
      content: contentWithDisclaimer,
      tokenUsage: llmResponse.usage.totalTokens,
      provider: llmResponse.provider,
      model: llmResponse.model,
    };

    // Step 9: Cache the result
    const cacheTTL = this.configService.get('cacheTTL') || 3600;
    await this.cacheService.set(cacheKey, result, cacheTTL);
    console.log(`[TranslationService] Cached translation with TTL ${cacheTTL}s`);

    // Step 10: Save translation to database
    await this.prisma.translation.create({
      data: {
        conversationId,
        requestedByUserId: userId,
        originalMessages: JSON.stringify(messages),
        translatedContent: contentWithDisclaimer,
        targetRole: userProfile.role,
        language: userProfile.language,
        llmProvider: llmResponse.provider,
        tokenUsage: llmResponse.usage.totalTokens,
      },
    });

    // Return result
    return result;
  }

  /**
   * Redact PII from conversation messages
   * @param messages - Conversation messages
   * @returns Messages with PII redacted
   * @private
   */
  private redactPIIFromMessages(messages: ConversationMessage[]): ConversationMessage[] {
    return messages.map((msg) => {
      const redacted = this.piiRedactor.redact(msg.text);

      // Log redactions if any were made
      if (redacted.redactions.length > 0) {
        this.piiRedactor.logRedactions(redacted.redactions);
      }

      return {
        user: msg.user,
        text: redacted.text,
      };
    });
  }

  /**
   * Add AI disclaimer to translated content
   * @param content - Translation content
   * @returns Content with disclaimer appended
   * @private
   */
  private addDisclaimer(content: string): string {
    return `${content}\n\n${AI_DISCLAIMER}`;
  }

  /**
   * Get the AI disclaimer text
   * @returns AI disclaimer string
   */
  getDisclaimer(): string {
    return AI_DISCLAIMER;
  }

  /**
   * Translate messages directly without database lookup
   * Useful for testing or ephemeral translations
   * Uses caching to avoid redundant LLM calls
   *
   * @param userProfile - User profile
   * @param messages - Conversation messages
   * @param style - Translation style
   * @returns Translation content
   */
  async translateMessages(
    userProfile: UserProfile,
    messages: ConversationMessage[],
    style: string
  ): Promise<string> {
    // Generate cache key
    const cacheKey = generateCacheKey(
      messages,
      userProfile.role,
      userProfile.language,
      style
    );

    // Check cache first
    const cached = await this.cacheService.get<TranslationResult>(cacheKey);
    if (cached) {
      console.log('[TranslationService] Cache hit - returning cached translation');
      return cached.content;
    }

    console.log('[TranslationService] Cache miss - generating new translation');

    // Redact PII
    const redactedMessages = this.redactPIIFromMessages(messages);

    // Check if summarization needed
    let processedMessages = redactedMessages;
    if (this.conversationSummarizer.exceedsTokenLimit(redactedMessages)) {
      const summary = await this.conversationSummarizer.summarize(
        redactedMessages,
        this.llmProvider
      );
      processedMessages = [summary];
    }

    // Build prompt
    const prompt = this.promptBuilder.buildPrompt(userProfile, processedMessages, style);

    // Call LLM
    const llmResponse = await this.llmProvider.complete(prompt, {
      temperature: 0.4,
      maxTokens: 1000,
    });

    // Add disclaimer
    const contentWithDisclaimer = this.addDisclaimer(llmResponse.content);

    // Create result for caching
    const result: TranslationResult = {
      content: contentWithDisclaimer,
      tokenUsage: llmResponse.usage.totalTokens,
      provider: llmResponse.provider,
      model: llmResponse.model,
    };

    // Cache the result
    const cacheTTL = this.configService.get('cacheTTL') || 3600;
    await this.cacheService.set(cacheKey, result, cacheTTL);
    console.log(`[TranslationService] Cached translation with TTL ${cacheTTL}s`);

    return contentWithDisclaimer;
  }

  /**
   * Get cache service instance for statistics and management
   * @returns Cache service instance
   */
  getCacheService(): CacheService {
    return this.cacheService;
  }

  /**
   * Clear all cached translations
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
    console.log('[TranslationService] Cleared all cached translations');
  }
}
