/**
 * Rate Limiting Middleware
 * Implements per-user rate limiting to prevent abuse
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ConfigService } from '../config/ConfigService.js';

/**
 * Simple in-memory store for rate limiting
 * For production, this could be replaced with a Redis store for distributed systems
 */
class MemoryStore {
  private hits: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.hits.entries()) {
        if (now >= value.resetTime) {
          this.hits.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Increment hit count for a key
   */
  increment(key: string, windowMs: number): { totalHits: number; resetTime: Date } {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (existing && now < existing.resetTime) {
      // Within the same window, increment count
      existing.count++;
      return {
        totalHits: existing.count,
        resetTime: new Date(existing.resetTime),
      };
    } else {
      // New window, reset count
      const resetTime = now + windowMs;
      this.hits.set(key, { count: 1, resetTime });
      return {
        totalHits: 1,
        resetTime: new Date(resetTime),
      };
    }
  }

  /**
   * Decrement hit count for a key (for unsuccessful requests)
   */
  decrement(key: string): void {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
      if (existing.count === 0) {
        this.hits.delete(key);
      }
    }
  }

  /**
   * Reset hit count for a key
   */
  resetKey(key: string): void {
    this.hits.delete(key);
  }

  /**
   * Clean up the store (called when server shuts down)
   */
  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

// Create singleton instance
const store = new MemoryStore();

/**
 * Create rate limiter middleware for general API endpoints
 * Default: 60 requests per minute per user
 */
export function createApiRateLimiter(configService?: ConfigService) {
  const config = configService || new ConfigService();
  config.load();

  // Get rate limit from config or use default
  const rateLimitValue = config.get('rateLimitPerMinute');
  const maxRequests = typeof rateLimitValue === 'string' ? parseInt(rateLimitValue, 10) : 60;

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxRequests,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers

    // Use custom key generator to rate limit per user
    keyGenerator: (req: Request): string => {
      // Use authenticated user ID if available
      if (req.user?.userId) {
        return `user:${req.user.userId}`;
      }
      // Fall back to IP address for unauthenticated requests
      // Use forwarded IP if behind proxy, otherwise use socket address
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      return `ip:${ip}`;
    },

    // Custom handler for rate limit exceeded
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    },

    // Skip successful requests (only count failed requests)
    skip: (req: Request, res: Response) => {
      // Don't skip any requests - count all
      return false;
    },

    // Store implementation
    store: {
      increment: (key: string) => {
        return store.increment(key, 60 * 1000);
      },
      decrement: (key: string) => {
        store.decrement(key);
      },
      resetKey: (key: string) => {
        store.resetKey(key);
      },
    } as any,
  });
}

/**
 * Create rate limiter middleware for LLM/translation endpoints
 * More restrictive: 10 requests per minute per user (from spec)
 */
export function createTranslationRateLimiter(configService?: ConfigService) {
  const config = configService || new ConfigService();
  config.load();

  // Get rate limit from config or use default (10 per minute from spec)
  const rateLimitValue = config.get('rateLimitPerMinute'); // Use general rate limit config
  const maxRequests = typeof rateLimitValue === 'string' ? parseInt(rateLimitValue, 10) : 10;

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req: Request): string => {
      if (req.user?.userId) {
        return `translation:user:${req.user.userId}`;
      }
      // For Slack commands, use Slack user ID
      if (req.body?.user_id) {
        return `translation:slack:${req.body.user_id}`;
      }
      // Fall back to IP address
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      return `translation:ip:${ip}`;
    },

    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. You can make up to ${maxRequests} translation requests per minute. Please try again later.`,
      });
    },

    store: {
      increment: (key: string) => {
        return store.increment(key, 60 * 1000);
      },
      decrement: (key: string) => {
        store.decrement(key);
      },
      resetKey: (key: string) => {
        store.resetKey(key);
      },
    } as any,
  });
}

/**
 * Export store for testing and cleanup
 */
export { store as rateLimitStore };
