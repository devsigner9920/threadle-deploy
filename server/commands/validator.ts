/**
 * Command Validation
 * Validates user permissions, rate limits, and command context
 */

import { SlackCommandPayload } from './types.js';
import { getPrismaClient } from '../database/client.js';
import { ConfigService } from '../config/index.js';

/**
 * Rate limiter storage
 * Maps user ID to array of command timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check if user is within rate limits
 * @param userId - Slack user ID
 * @returns Validation result
 */
export function checkRateLimit(userId: string): ValidationResult {
  const configService = new ConfigService();
  configService.load();

  const rateLimitPerMinute = configService.get('rateLimitPerMinute') || 10;
  const now = Date.now();
  const oneMinuteAgo = now - 60000; // 60 seconds

  // Get user's recent command timestamps
  const timestamps = rateLimitStore.get(userId) || [];

  // Filter out timestamps older than 1 minute
  const recentTimestamps = timestamps.filter(ts => ts > oneMinuteAgo);

  // Check if user has exceeded rate limit
  if (recentTimestamps.length >= rateLimitPerMinute) {
    return {
      valid: false,
      error: `Rate limit exceeded. You can use ${rateLimitPerMinute} commands per minute. Please try again in a moment.`,
    };
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitStore.set(userId, recentTimestamps);

  return { valid: true };
}

/**
 * Validate user permissions (check if user exists or needs to be created)
 * @param userId - Slack user ID
 * @returns Validation result
 */
export async function validateUserPermissions(
  userId: string
): Promise<ValidationResult> {
  try {
    const prisma = getPrismaClient();

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { slackUserId: userId },
    });

    // User doesn't exist - this is okay, they can still use commands
    // They'll get default settings or be prompted to set up profile
    if (!user) {
      console.log(`User ${userId} not found in database - will use default settings`);
    }

    // All users are allowed to use commands
    return { valid: true };
  } catch (error) {
    console.error('Error validating user permissions:', error);
    // On error, allow the command to proceed
    // This ensures the bot doesn't break if database is temporarily unavailable
    return { valid: true };
  }
}

/**
 * Validate command payload
 * @param payload - Slack command payload
 * @returns Validation result
 */
export function validateCommandPayload(
  payload: SlackCommandPayload
): ValidationResult {
  // Validate required fields
  if (!payload.team_id) {
    return { valid: false, error: 'Missing team ID in command payload' };
  }

  if (!payload.user_id) {
    return { valid: false, error: 'Missing user ID in command payload' };
  }

  if (!payload.channel_id) {
    return { valid: false, error: 'Missing channel ID in command payload' };
  }

  if (!payload.command) {
    return { valid: false, error: 'Missing command in payload' };
  }

  return { valid: true };
}

/**
 * Validate all command requirements
 * @param payload - Slack command payload
 * @returns Validation result with detailed error message
 */
export async function validateCommand(
  payload: SlackCommandPayload
): Promise<ValidationResult> {
  // Validate payload structure
  const payloadValidation = validateCommandPayload(payload);
  if (!payloadValidation.valid) {
    return payloadValidation;
  }

  // Check rate limits
  const rateLimitValidation = checkRateLimit(payload.user_id);
  if (!rateLimitValidation.valid) {
    return rateLimitValidation;
  }

  // Validate user permissions
  const permissionValidation = await validateUserPermissions(payload.user_id);
  if (!permissionValidation.valid) {
    return permissionValidation;
  }

  return { valid: true };
}

/**
 * Clear rate limit history (for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
