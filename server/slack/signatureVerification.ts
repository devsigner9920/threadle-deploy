/**
 * Slack Request Signature Verification
 * Implements request signature verification using Slack signing secret
 * to prevent request spoofing attacks.
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { SecretsService } from '../config/index.js';

/**
 * Verify Slack request signature
 * @param signature - The signature from the x-slack-signature header
 * @param timestamp - The timestamp from the x-slack-request-timestamp header
 * @param body - The raw request body as string
 * @param signingSecret - The Slack signing secret
 * @returns true if signature is valid, false otherwise
 */
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean {
  // Check if timestamp is within 5 minutes to prevent replay attacks
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const requestTimestamp = parseInt(timestamp, 10);

  if (Math.abs(currentTimestamp - requestTimestamp) > 300) {
    console.error('Slack request timestamp outside 5-minute window');
    return false;
  }

  // Create signature base string
  const sigBasestring = `v0:${timestamp}:${body}`;

  // Calculate expected signature
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  // Compare signatures using timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (error) {
    // Signatures are different lengths
    return false;
  }
}

/**
 * Express middleware to verify Slack request signatures
 * Protects endpoints from request spoofing
 */
export function slackSignatureVerificationMiddleware(
  secretsService: SecretsService
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get signature and timestamp from headers
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    // Validate headers exist
    if (!signature || !timestamp) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Missing Slack signature headers',
      });
      return;
    }

    // Get signing secret from secrets service
    const signingSecret = secretsService.getSecret('slackSigningSecret');

    if (!signingSecret) {
      console.error('Slack signing secret not configured');
      res.status(500).json({
        error: 'Configuration error',
        message: 'Slack signing secret not configured',
      });
      return;
    }

    // Get raw body for signature verification
    // For URL-encoded bodies, we need to reconstruct the original string
    let rawBody: string;

    if ((req as any).rawBody) {
      // If rawBody middleware was used, use that
      rawBody = (req as any).rawBody;
    } else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      // For URL-encoded forms, reconstruct the query string from body
      rawBody = new URLSearchParams(req.body).toString();
    } else {
      // For JSON, stringify the body
      rawBody = JSON.stringify(req.body);
    }

    // Verify signature
    const isValid = verifySlackSignature(
      signature,
      timestamp,
      rawBody,
      signingSecret
    );

    if (!isValid) {
      console.error('Invalid Slack request signature');
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid request signature',
      });
      return;
    }

    // Signature is valid, continue to next middleware
    next();
  };
}

/**
 * Middleware to capture raw request body for signature verification
 * Must be applied before express.json() middleware
 */
export function rawBodyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  let data = '';

  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
}
