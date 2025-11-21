/**
 * Translation Service Tests
 * Tests for prompt engineering, translation service, and PII redaction
 */

import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import { PromptBuilder } from '../server/translation/PromptBuilder';
import { TranslationService } from '../server/translation/TranslationService';
import { PIIRedactor } from '../server/translation/PIIRedactor';
import { ConversationSummarizer } from '../server/translation/ConversationSummarizer';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Translation Service', () => {
  let configService: ConfigService;
  let secretsService: SecretsService;
  let promptBuilder: PromptBuilder;
  let testConfigDir: string;

  beforeEach(() => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-translation-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);
    configService.load();

    // Set up a mock API key for LLM provider
    secretsService.updateSecret('llmApiKey', 'test-api-key-12345');
    configService.set('llmProvider', 'openai');

    promptBuilder = new PromptBuilder();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('PromptBuilder', () => {
    test('should generate prompt with user context', () => {
      const user = {
        role: 'Engineering-Backend',
        language: 'English',
        customInstructions: 'Focus on performance implications',
        preferredStyle: 'Technical Lite',
      };

      const conversation = [
        { user: 'Alice', text: 'We need to refactor the API gateway' },
        { user: 'Bob', text: 'The latency is too high in production' },
      ];

      const prompt = promptBuilder.buildPrompt(user, conversation, 'Technical Lite');

      // Should include user role
      expect(prompt).toContain('Engineering-Backend');
      // Should include custom instructions
      expect(prompt).toContain('Focus on performance implications');
      // Should include conversation context
      expect(prompt).toContain('API gateway');
      expect(prompt).toContain('latency');
      // Should include style
      expect(prompt).toContain('Technical Lite');
    });

    test('should customize prompt based on role', () => {
      const engineerUser = {
        role: 'Engineering-Frontend',
        language: 'English',
        customInstructions: null,
        preferredStyle: 'Technical Lite',
      };

      const designUser = {
        role: 'Design',
        language: 'English',
        customInstructions: null,
        preferredStyle: 'ELI5',
      };

      const conversation = [
        { user: 'Alice', text: 'We need to implement SSR for better SEO' },
      ];

      const engineerPrompt = promptBuilder.buildPrompt(engineerUser, conversation, 'Technical Lite');
      const designPrompt = promptBuilder.buildPrompt(designUser, conversation, 'ELI5');

      // Engineer prompt should focus on implementation
      expect(engineerPrompt).toContain('Engineering-Frontend');

      // Designer prompt should focus on user experience
      expect(designPrompt).toContain('Design');

      // Prompts should be different
      expect(engineerPrompt).not.toBe(designPrompt);
    });
  });

  describe('TranslationService', () => {
    test('should generate explanation with disclaimer', async () => {
      // Create translation service with mock API key
      const translationService = new TranslationService(configService, secretsService);

      // Test the disclaimer format
      const disclaimer = translationService.getDisclaimer();

      expect(disclaimer).toContain('AI-generated');
      expect(disclaimer).toContain('verify important details');
    });
  });

  describe('PIIRedactor', () => {
    test('should redact email addresses', () => {
      const redactor = new PIIRedactor();

      const text = 'Contact me at john.doe@example.com for more info';
      const redacted = redactor.redact(text);

      expect(redacted.text).toContain('[REDACTED]');
      expect(redacted.text).not.toContain('john.doe@example.com');
      expect(redacted.redactions.length).toBeGreaterThan(0);
      expect(redacted.redactions[0]?.type).toBe('email');
    });

    test('should redact phone numbers', () => {
      const redactor = new PIIRedactor();

      const text = 'Call me at 555-123-4567 or (555) 987-6543';
      const redacted = redactor.redact(text);

      expect(redacted.text).toContain('[REDACTED]');
      expect(redacted.text).not.toContain('555-123-4567');
      expect(redacted.redactions.length).toBeGreaterThan(0);
    });

    test('should redact potential tokens/passwords', () => {
      const redactor = new PIIRedactor();

      const text = 'API key: sk-live-51Hzabcdef1234567890abcdefgh';
      const redacted = redactor.redact(text);

      expect(redacted.text).toContain('[REDACTED]');
      expect(redacted.text).not.toContain('sk-live-51Hzabcdef1234567890abcdefgh');
      expect(redacted.redactions.length).toBeGreaterThan(0);
      expect(redacted.redactions[0]?.type).toBe('token');
    });

    test('should track multiple redactions', () => {
      const redactor = new PIIRedactor();

      const text = 'Email john@example.com and call (555) 123-4567. Token: sk-test-abc123def456ghi789jkl012';
      const redacted = redactor.redact(text);

      expect(redacted.redactions.length).toBeGreaterThanOrEqual(2);
      expect(redacted.text).toContain('[REDACTED]');
    });
  });

  describe('ConversationSummarizer', () => {
    test('should detect when conversation exceeds token limit', () => {
      const summarizer = new ConversationSummarizer();

      // Create a long conversation
      const longConversation = Array(100).fill(null).map((_, i) => ({
        user: `User${i}`,
        text: 'This is a long message with lots of technical jargon and details about the implementation of microservices architecture.',
      }));

      const exceedsLimit = summarizer.exceedsTokenLimit(longConversation, 2000);

      expect(exceedsLimit).toBe(true);
    });

    test('should not flag short conversations', () => {
      const summarizer = new ConversationSummarizer();

      const shortConversation = [
        { user: 'Alice', text: 'Hello' },
        { user: 'Bob', text: 'Hi there' },
      ];

      const exceedsLimit = summarizer.exceedsTokenLimit(shortConversation, 2000);

      expect(exceedsLimit).toBe(false);
    });
  });

  describe('Translation Styles', () => {
    test('should support ELI5 style', () => {
      const builder = new PromptBuilder();

      const user = {
        role: 'Marketing',
        language: 'English',
        customInstructions: null,
        preferredStyle: 'ELI5',
      };

      const conversation = [
        { user: 'Engineer', text: 'We use OAuth2 for authentication' },
      ];

      const prompt = builder.buildPrompt(user, conversation, 'ELI5');

      expect(prompt).toContain('ELI5');
    });

    test('should support Business Summary style', () => {
      const builder = new PromptBuilder();

      const user = {
        role: 'Product',
        language: 'English',
        customInstructions: null,
        preferredStyle: 'Business Summary',
      };

      const conversation = [
        { user: 'Engineer', text: 'Implementing Redis cache reduced latency by 50%' },
      ];

      const prompt = builder.buildPrompt(user, conversation, 'Business Summary');

      expect(prompt).toContain('Business Summary');
    });
  });
});
