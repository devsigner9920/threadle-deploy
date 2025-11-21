/**
 * CacheService - In-memory caching implementation
 * Provides thread-safe caching with TTL support
 */

import { ICacheService, CacheEntry, CacheStats } from './types.js';

/**
 * In-memory cache service implementation
 * Uses Map for storage with automatic expiration cleanup
 */
export class CacheService implements ICacheService {
  private cache: Map<string, CacheEntry>;
  private cleanupInterval: NodeJS.Timeout | null;
  private stats: {
    hits: number;
    misses: number;
  };

  /**
   * Create a new CacheService instance
   * @param cleanupIntervalMs - Interval for automatic cleanup in milliseconds (default: 60000 = 1 minute)
   */
  constructor(cleanupIntervalMs: number = 60000) {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
    };

    // Start automatic cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    // Check if entry exists and is not expired
    if (entry) {
      const now = Date.now();
      if (now < entry.expiresAt) {
        // Cache hit
        this.stats.hits++;
        return entry.value as T;
      } else {
        // Entry expired, remove it
        this.cache.delete(key);
      }
    }

    // Cache miss
    this.stats.misses++;
    return null;
  }

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  async set<T = any>(key: string, value: T, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a specific cache entry
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   * Called automatically by cleanup interval
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[CacheService] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Destroy the cache service and stop cleanup interval
   * Should be called when shutting down the application
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  /**
   * Get the number of entries in cache (including expired)
   * @returns Number of cache entries
   */
  size(): number {
    return this.cache.size;
  }
}
