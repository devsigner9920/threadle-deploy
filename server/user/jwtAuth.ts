/**
 * JWT Authentication Utilities
 * Handles JWT token generation and validation
 */

import * as jwt from 'jsonwebtoken';
import { ConfigService } from '../config/ConfigService.js';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  slackUserId: string;
  isAdmin: boolean;
}

/**
 * JWT utilities class
 */
export class JWTAuth {
  private secret: string;
  private defaultExpiresIn: string;

  /**
   * Create a new JWTAuth instance
   * @param configService - Configuration service
   */
  constructor(configService: ConfigService) {
    // Get JWT secret from config or use default for development
    this.secret = configService.get('jwtSecret') || 'threadle-dev-secret-change-in-production';
    this.defaultExpiresIn = '24h'; // Token expires in 24 hours
  }

  /**
   * Generate JWT token for a user
   * @param payload - JWT payload
   * @param expiresIn - Optional custom expiration time (e.g., '1h', '7d', '1ms')
   * @returns Signed JWT token
   */
  generateToken(payload: JWTPayload, expiresIn?: string): string {
    console.log(`[JWTAuth] Generating token for user: ${payload.userId}`);

    // Use jwt.sign with expiresIn option
    const token = jwt.sign(payload, this.secret, {
      expiresIn: expiresIn || this.defaultExpiresIn,
    } as jwt.SignOptions);

    return token;
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token string
   * @returns Decoded payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Decode JWT token without verification (use with caution)
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('[JWTAuth] Error decoding token:', error);
      return null;
    }
  }
}

/**
 * Factory function to create JWT auth instance
 * @param configService - Configuration service
 * @returns JWTAuth instance
 */
export function createJWTAuth(configService: ConfigService): JWTAuth {
  return new JWTAuth(configService);
}
