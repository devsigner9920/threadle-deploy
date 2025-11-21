/**
 * Cache Service Types
 * Type definitions for caching layer
 */

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export interface ICacheService {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  set<T = any>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Delete a specific cache entry
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats;
}
