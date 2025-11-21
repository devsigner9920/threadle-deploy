/**
 * Event Deduplication Service
 * Prevents duplicate processing of Slack events using in-memory cache
 */

/**
 * In-memory cache for processed event IDs
 * Structure: Map<eventId, timestamp>
 */
class EventDeduplicationCache {
  private cache: Map<string, number>;
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.cache = new Map();
    // Schedule periodic cleanup every hour
    this.scheduleCleanup();
  }

  /**
   * Check if event has already been processed
   * @param eventId - Slack event ID
   * @returns true if event was already processed, false otherwise
   */
  isDuplicate(eventId: string): boolean {
    const timestamp = this.cache.get(eventId);

    if (!timestamp) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - timestamp > this.TTL_MS) {
      // Remove expired entry
      this.cache.delete(eventId);
      return false;
    }

    return true;
  }

  /**
   * Mark event as processed
   * @param eventId - Slack event ID
   */
  markProcessed(eventId: string): void {
    this.cache.set(eventId, Date.now());
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [eventId, timestamp] of this.cache.entries()) {
      if (now - timestamp > this.TTL_MS) {
        expiredKeys.push(eventId);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Event deduplication cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Schedule periodic cleanup of expired entries
   */
  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Get current cache size (for debugging/monitoring)
   */
  getSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const eventDeduplicationCache = new EventDeduplicationCache();
