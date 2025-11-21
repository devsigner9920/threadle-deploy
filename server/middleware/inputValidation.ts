/**
 * Input Validation Middleware
 * Validates and sanitizes user input to prevent XSS and other injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Create validation middleware for request body
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body against schema
      const validated = schema.parse(req.body);

      // Replace request body with validated data
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Return validation errors
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        // Unexpected error
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to validate request',
        });
      }
    }
  };
}

/**
 * Create validation middleware for query parameters
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to validate query parameters',
        });
      }
    }
  };
}

/**
 * Create validation middleware for URL parameters
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid URL parameters',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to validate parameters',
        });
      }
    }
  };
}

/**
 * Sanitize string to prevent XSS
 * Removes or escapes potentially dangerous characters
 * Note: React automatically escapes values, but this provides defense in depth
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Escape HTML special characters (defense in depth)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  /**
   * UUID validation
   */
  uuid: z.string().uuid(),

  /**
   * Email validation
   */
  email: z.string().email(),

  /**
   * Non-empty string
   */
  nonEmptyString: z.string().min(1).max(10000),

  /**
   * Optional string
   */
  optionalString: z.string().optional(),

  /**
   * Positive integer
   */
  positiveInt: z.number().int().positive(),

  /**
   * Date string
   */
  dateString: z.string().datetime(),

  /**
   * Boolean
   */
  boolean: z.boolean(),

  /**
   * Pagination cursor
   */
  cursor: z.string().optional(),

  /**
   * Page size (1-100)
   */
  pageSize: z.number().int().min(1).max(100).default(20),
};

/**
 * Middleware to sanitize all string inputs in request body
 * Apply this after validation to sanitize validated strings
 */
export function sanitizeBodyStrings(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize all strings in an object
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
