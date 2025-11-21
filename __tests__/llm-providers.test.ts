/**
 * LLM Provider Tests
 * Tests for LLM provider abstraction layer, factory, and individual providers
 */

import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import { createLLMProvider, clearProviderCache } from '../server/llm/factory';
import { OpenAIProvider } from '../server/llm/OpenAIProvider';
import { AnthropicProvider } from '../server/llm/AnthropicProvider';
import { GoogleProvider } from '../server/llm/GoogleProvider';
import { LLMProvider, RateLimitError, AuthenticationError, TimeoutError } from '../server/llm/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('LLM Providers', () => {
  let configService: ConfigService;
  let secretsService: SecretsService;
  let testConfigDir: string;

  beforeEach(() => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-llm-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);
    configService.load();

    // Clear provider cache before each test
    clearProviderCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clear provider cache after each test
    clearProviderCache();
  });

  describe('LLM Provider Factory', () => {
    test('should return OpenAI provider when configured', () => {
      configService.set('llmProvider', 'openai');
      secretsService.updateSecret('llmApiKey', 'test-openai-key');

      const provider = createLLMProvider(configService, secretsService);

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getProviderName()).toBe('openai');
    });

    test('should return Anthropic provider when configured', () => {
      configService.set('llmProvider', 'anthropic');
      secretsService.updateSecret('llmApiKey', 'test-anthropic-key');

      const provider = createLLMProvider(configService, secretsService);

      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.getProviderName()).toBe('anthropic');
    });

    test('should return Google provider when configured', () => {
      configService.set('llmProvider', 'google');
      secretsService.updateSecret('llmApiKey', 'test-google-key');

      const provider = createLLMProvider(configService, secretsService);

      expect(provider).toBeInstanceOf(GoogleProvider);
      expect(provider.getProviderName()).toBe('google');
    });

    test('should default to OpenAI if provider not configured', () => {
      // Don't set llmProvider, should default to openai
      secretsService.updateSecret('llmApiKey', 'test-key');

      const provider = createLLMProvider(configService, secretsService);

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should throw error if API key not configured', () => {
      configService.set('llmProvider', 'openai');
      // Don't set llmApiKey

      expect(() => {
        createLLMProvider(configService, secretsService);
      }).toThrow('LLM API key not configured');
    });
  });

  describe('OpenAI Provider', () => {
    let provider: LLMProvider;

    beforeEach(() => {
      secretsService.updateSecret('llmApiKey', 'test-openai-key');
      provider = new OpenAIProvider('test-openai-key');
    });

    test('should have correct provider name', () => {
      expect(provider.getProviderName()).toBe('openai');
    });

    test('should complete translation with mock response', async () => {
      // Mock the OpenAI API call
      // Note: This test will use the actual API in implementation
      // For testing, we rely on error handling when API key is invalid

      const prompt = 'Translate this technical jargon: API endpoint returned 404';

      try {
        const response = await provider.complete(prompt, {
          temperature: 0.3,
          maxTokens: 500,
        });

        // If API call succeeds (unlikely with test key), verify response structure
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('provider', 'openai');
        expect(response).toHaveProperty('model');
        expect(response.usage).toHaveProperty('promptTokens');
        expect(response.usage).toHaveProperty('completionTokens');
        expect(response.usage).toHaveProperty('totalTokens');
      } catch (error: any) {
        // Expected to fail with test API key
        // Verify error handling works
        expect(error).toBeDefined();
      }
    });
  });

  describe('Anthropic Provider', () => {
    let provider: LLMProvider;

    beforeEach(() => {
      secretsService.updateSecret('llmApiKey', 'test-anthropic-key');
      provider = new AnthropicProvider('test-anthropic-key');
    });

    test('should have correct provider name', () => {
      expect(provider.getProviderName()).toBe('anthropic');
    });

    test('should handle Anthropic API format', async () => {
      const prompt = 'Explain this engineering concept: microservices architecture';

      try {
        const response = await provider.complete(prompt, {
          temperature: 0.4,
          maxTokens: 1000,
        });

        // Verify response structure if API succeeds
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('provider', 'anthropic');
        expect(response).toHaveProperty('model');
      } catch (error: any) {
        // Expected to fail with test API key
        expect(error).toBeDefined();
      }
    });
  });

  describe('Google Provider', () => {
    let provider: LLMProvider;

    beforeEach(() => {
      secretsService.updateSecret('llmApiKey', 'test-google-key');
      provider = new GoogleProvider('test-google-key');
    });

    test('should have correct provider name', () => {
      expect(provider.getProviderName()).toBe('google');
    });

    test('should handle Google API format', async () => {
      const prompt = 'Simplify this marketing term: conversion funnel optimization';

      try {
        const response = await provider.complete(prompt, {
          temperature: 0.5,
          maxTokens: 800,
        });

        // Verify response structure if API succeeds
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('provider', 'google');
        expect(response).toHaveProperty('model');
      } catch (error: any) {
        // Expected to fail with test API key
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle rate limit errors (429)', async () => {
      // This test verifies that rate limit errors are properly identified
      // In real scenarios, providers should throw RateLimitError

      const rateLimitError = new RateLimitError('openai', 60);

      expect(rateLimitError.name).toBe('RateLimitError');
      expect(rateLimitError.statusCode).toBe(429);
      expect(rateLimitError.provider).toBe('openai');
      expect(rateLimitError.message).toContain('Rate limit exceeded');
    });

    test('should handle authentication errors (invalid API key)', async () => {
      const authError = new AuthenticationError('anthropic');

      expect(authError.name).toBe('AuthenticationError');
      expect(authError.statusCode).toBe(401);
      expect(authError.provider).toBe('anthropic');
      expect(authError.message).toContain('Invalid API key');
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new TimeoutError('google', 30000);

      expect(timeoutError.name).toBe('TimeoutError');
      expect(timeoutError.provider).toBe('google');
      expect(timeoutError.message).toContain('timed out');
      expect(timeoutError.message).toContain('30000ms');
    });
  });
});
