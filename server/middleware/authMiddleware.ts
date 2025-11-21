/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user info to request object
 */

import { Request, Response, NextFunction } from 'express';
import { JWTAuth, JWTPayload } from '../user/jwtAuth.js';
import { ConfigService } from '../config/ConfigService.js';

/**
 * Extend Express Request interface to include user
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Create authentication middleware
 * @param configService - Configuration service
 * @returns Express middleware function
 */
export function createAuthMiddleware(configService: ConfigService) {
  const jwtAuth = new JWTAuth(configService);

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Extract token from Authorization header or cookie
      let token: string | undefined;

      // Try Authorization header first (Bearer token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // Fall back to cookie if no Authorization header
      if (!token && req.cookies && req.cookies['auth_token']) {
        token = req.cookies['auth_token'];
      }

      // If no token found, return 401
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required. Please provide a valid token.',
        });
        return;
      }

      // Verify token
      const payload = jwtAuth.verifyToken(token);

      // Attach user info to request
      req.user = payload;

      console.log(`[AuthMiddleware] Authenticated user: ${payload.userId} (admin: ${payload.isAdmin})`);

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('[AuthMiddleware] Authentication error:', error);

      // Return 401 for invalid/expired tokens
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid or expired token',
      });
    }
  };
}

/**
 * Create admin-only middleware
 * Requires authentication and checks if user is admin
 * @param configService - Configuration service
 * @returns Express middleware function
 */
export function createAdminMiddleware(configService: ConfigService) {
  const authMiddleware = createAuthMiddleware(configService);

  return (req: Request, res: Response, next: NextFunction): void => {
    // First authenticate the user
    authMiddleware(req, res, (err?: any) => {
      if (err) {
        return;
      }

      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
        });
        return;
      }

      // User is admin, continue
      next();
    });
  };
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 * @param configService - Configuration service
 * @returns Express middleware function
 */
export function createOptionalAuthMiddleware(configService: ConfigService) {
  const jwtAuth = new JWTAuth(configService);

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Extract token
      let token: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token && req.cookies && req.cookies['auth_token']) {
        token = req.cookies['auth_token'];
      }

      // If token exists, verify it
      if (token) {
        const payload = jwtAuth.verifyToken(token);
        req.user = payload;
      }

      // Continue regardless of token presence
      next();
    } catch (error) {
      // Silently ignore authentication errors in optional mode
      next();
    }
  };
}
