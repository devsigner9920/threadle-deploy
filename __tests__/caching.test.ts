/**
 * Translation Caching Tests
 * Tests for translation caching layer
 */

import { CacheService } from '../server/cache/CacheService';
import { TranslationService } from '../server/translation/TranslationService';
import { ConfigService } from '../server/config/ConfigService';
import { SecretsService } from '../server/config/SecretsService';
import { generateCacheKey } from '../server/cache/cacheKeyGenerator';
import { ConversationMessage } from '../server/translation/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Translation Caching', () => {
  let cacheService: CacheService;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let testConfigDir: string;

  beforeEach(() => {
    // Create temporary config directory for testing
    testConfigDir = path.join(os.tmpdir(), `.threadle-test-cache-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });

    configService = new ConfigService(testConfigDir);
    secretsService = new SecretsService(testConfigDir);
    configService.load();

    // Set up test configuration
    configService.set('cacheTTL', 60); // 60 seconds for testing
    secretsService.updateSecret('llmApiKey', 'test-api-key-12345');
    configService.set('llmProvider', 'openai');

    cacheService = new CacheService();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clear cache
    cacheService.clear();
  });

  describe('CacheService', () => {
    test('should store and retrieve cached values', async () => {
      const key = 'test-key';
      const value = { content: 'Test translation', tokenUsage: 100 };

      // Set cache
      await cacheService.set(key, value, 60);

      // Get cache
      const cached = await cacheService.get(key);

      expect(cached).toEqual(value);
    });

    test('should return null for cache miss', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('should respect TTL and expire entries', async () => {
      const key = 'expiring-key';
      const value = 'test value';

      // Set cache with 1 second TTL
      await cacheService.set(key, value, 1);

      // Immediately should be available
      let cached = await cacheService.get(key);
      expect(cached).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired now
      cached = await cacheService.get(key);
      expect(cached).toBeNull();
    });

    test('should delete specific cache entries', async () => {
      const key = 'delete-test';
      const value = 'test value';

      await cacheService.set(key, value, 60);

      // Verify it's cached
      expect(await cacheService.get(key)).toBe(value);

      // Delete it
      await cacheService.delete(key);

      // Should be gone
      expect(await cacheService.get(key)).toBeNull();
    });

    test('should clear all cache entries', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.set('key2', 'value2', 60);
      await cacheService.set('key3', 'value3', 60);

      // Clear all
      await cacheService.clear();

      // All should be gone
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
      expect(await cacheService.get('key3')).toBeNull();
    });

    test('should track cache statistics', async () => {
      // Reset stats
      cacheService.clear();

      // Generate hits and misses
      await cacheService.set('test', 'value', 60);

      await cacheService.get('test'); // Hit
      await cacheService.get('test'); // Hit
      await cacheService.get('missing1'); // Miss
      await cacheService.get('missing2'); // Miss

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.5);
      expect(stats.size).toBe(1);
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys for same input', () => {
      const messages: ConversationMessage[] = [
        { user: 'Alice', text: 'Hello world' },
        { user: 'Bob', text: 'Hi there' },
      ];

      const key1 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'ELI5');
      const key2 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'ELI5');

      expect(key1).toBe(key2);
      expect(key1).toBeTruthy();
      expect(typeof key1).toBe('string');
    });

    test('should generate different keys for different messages', () => {
      const messages1: ConversationMessage[] = [
        { user: 'Alice', text: 'Hello world' },
      ];

      const messages2: ConversationMessage[] = [
        { user: 'Alice', text: 'Different message' },
      ];

      const key1 = generateCacheKey(messages1, 'Engineering-Backend', 'English', 'ELI5');
      const key2 = generateCacheKey(messages2, 'Engineering-Backend', 'English', 'ELI5');

      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different roles', () => {
      const messages: ConversationMessage[] = [
        { user: 'Alice', text: 'Hello world' },
      ];

      const key1 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'ELI5');
      const key2 = generateCacheKey(messages, 'Design', 'English', 'ELI5');

      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different languages', () => {
      const messages: ConversationMessage[] = [
        { user: 'Alice', text: 'Hello world' },
      ];

      const key1 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'ELI5');
      const key2 = generateCacheKey(messages, 'Engineering-Backend', 'Spanish', 'ELI5');

      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different styles', () => {
      const messages: ConversationMessage[] = [
        { user: 'Alice', text: 'Hello world' },
      ];

      const key1 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'ELI5');
      const key2 = generateCacheKey(messages, 'Engineering-Backend', 'English', 'Business Summary');

      expect(key1).not.toBe(key2);
    });
  });

  describe('Translation Service with Caching', () => {
    test('should verify cache integration with TranslationService', async () => {
      // Create a shared cache service
      const sharedCache = new CacheService();

      // Create translation service with shared cache
      const translationService = new TranslationService(configService, secretsService, sharedCache);

      const userProfile = {
        role: 'Engineering-Backend',
        language: 'English',
        customInstructions: null,
        preferredStyle: 'ELI5',
      };

      const messages: ConversationMessage[] = [
        { user: 'Alice', text: 'Simple test message' },
      ];

      // Generate cache key
      const cacheKey = generateCacheKey(messages, userProfile.role, userProfile.language, 'ELI5');

      // Pre-populate cache to simulate cached translation
      const cachedResult = {
        content: 'Cached translation',
        tokenUsage: 100,
        provider: 'openai',
        model: 'gpt-4',
      };

      await sharedCache.set(cacheKey, cachedResult, 3600);

      // Verify cache key generation works
      expect(cacheKey).toBeTruthy();
      expect(await sharedCache.get(cacheKey)).toEqual(cachedResult);

      // Verify translation service can access cache
      const serviceCacheStats = translationService.getCacheService().getStats();
      expect(serviceCacheStats).toBeDefined();
    });
  });
});
