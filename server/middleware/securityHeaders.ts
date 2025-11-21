/**
 * Security Headers Middleware
 * Implements security headers using helmet middleware
 */

import helmet from 'helmet';
import { Application } from 'express';

/**
 * Configure and apply security headers middleware
 * Implements CSP, HSTS, X-Frame-Options, noSniff, and other security headers
 */
export function configureSecurityHeaders(app: Application): void {
  // Apply helmet middleware with custom configuration
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
          imgSrc: ["'self'", 'data:', 'https:'], // Allow images from self, data URLs, and HTTPS
          connectSrc: ["'self'", 'https://slack.com', 'https://*.slack.com'], // Allow Slack API
          fontSrc: ["'self'", 'data:'], // Allow fonts from self and data URLs
          objectSrc: ["'none'"], // Disallow plugins
          mediaSrc: ["'self'"], // Only allow media from same origin
          frameSrc: ["'none'"], // Disallow frames
        },
      },

      // HTTP Strict Transport Security (HSTS)
      // Force HTTPS for 1 year, include subdomains
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },

      // X-Frame-Options: Prevent clickjacking
      frameguard: {
        action: 'deny', // Don't allow any framing
      },

      // X-Content-Type-Options: Prevent MIME sniffing
      noSniff: true,

      // X-DNS-Prefetch-Control: Control DNS prefetching
      dnsPrefetchControl: {
        allow: false,
      },

      // X-Download-Options: Prevent opening downloads in IE
      ieNoOpen: true,

      // Referrer-Policy: Control referrer information
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // X-Permitted-Cross-Domain-Policies: Restrict cross-domain access
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,
    })
  );

  console.log('[Security] Security headers configured with helmet');
}

/**
 * Configure CORS headers for API endpoints
 * Note: This is separate from helmet and should be applied as needed
 */
export function configureCORS(app: Application, allowedOrigins: string[] = []): void {
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      // In production, only allow whitelisted origins
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  console.log('[Security] CORS configured for allowed origins:', allowedOrigins);
}
