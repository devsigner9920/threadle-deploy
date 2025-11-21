/**
 * Cache Key Generator
 * Generates deterministic cache keys for translations
 */

import crypto from 'crypto';
import { ConversationMessage } from '../translation/types.js';

/**
 * Generate a deterministic cache key for translation
 * Key is based on: conversation messages + target role + language + style
 *
 * @param messages - Conversation messages
 * @param targetRole - Target user role
 * @param language - Target language
 * @param style - Translation style
 * @returns SHA256 hash as cache key
 */
export function generateCacheKey(
  messages: ConversationMessage[],
  targetRole: string,
  language: string,
  style: string
): string {
  // Create a deterministic string representation of the input
  const messageString = messages
    .map((msg) => `${msg.user}:${msg.text}`)
    .join('|');

  // Combine all factors that affect translation
  const input = `${messageString}||${targetRole}||${language}||${style}`;

  // Generate SHA256 hash
  const hash = crypto
    .createHash('sha256')
    .update(input)
    .digest('hex');

  return `translation:${hash}`;
}

/**
 * Generate a cache key prefix for pattern-based deletion
 * @param targetRole - Target user role (optional)
 * @param language - Target language (optional)
 * @returns Cache key prefix
 */
export function generateCacheKeyPrefix(
  targetRole?: string,
  language?: string
): string {
  const parts = ['translation'];

  if (targetRole) {
    parts.push(targetRole);
  }

  if (language) {
    parts.push(language);
  }

  return parts.join(':');
}
