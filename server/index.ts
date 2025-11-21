/**
 * Threadle Server Entry Point
 * Main Express application setup with API routes and middleware
 */

import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { runMigrations } from './database/migrate.js';
import { ConfigService } from './config/ConfigService.js';
import setupRoutes from './routes/setup.js';
import slackRoutes from './routes/slack.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import translationRoutes from './routes/translations.js';
import { staticFilesMiddleware } from './middleware/staticFiles.js';
import { configureSecurityHeaders } from './middleware/securityHeaders.js';
import { createApiRateLimiter } from './middleware/rateLimiter.js';

/**
 * Create and configure Express app
 */
async function createApp() {
  const app = express();

  // Load configuration
  const configService = new ConfigService();
  configService.load();

  // Security headers (helmet) - apply early
  configureSecurityHeaders(app);

  // Request logging
  app.use(morgan('combined'));

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookie parsing middleware
  app.use(cookieParser());

  // Global rate limiting for all API endpoints
  app.use('/api', createApiRateLimiter(configService));

  // Health check endpoint (no auth, no rate limiting)
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1/setup', setupRoutes);
  app.use('/api/v1/slack', slackRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/translations', translationRoutes);

  // Serve static files (React SPA)
  app.use(staticFilesMiddleware);

  return app;
}

// Create app instance for testing
let appInstance: express.Application | null = null;

/**
 * Get or create the app instance (for testing)
 */
async function getApp() {
  if (!appInstance) {
    appInstance = await createApp();
  }
  return appInstance;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Run database migrations
    console.log('Running database migrations...');
    await runMigrations();
    console.log('Database migrations completed successfully');

    // Create Express app
    const app = await createApp();

    // Get port from config
    const configService = new ConfigService();
    configService.load();
    const port = configService.get('port') || 3000;

    // Start listening
    const server = app.listen(port, () => {
      console.log(`\n🚀 Threadle server started on port ${port}`);
      console.log(`   Health check: http://localhost:${port}/health`);
      console.log(`   API: http://localhost:${port}/api/v1/`);
      console.log('');
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Export functions for testing and external usage
export { createApp, startServer, getApp };

// Export app for testing
export const app = getApp();

// Start server only when executed directly (not when imported)
// This is a workaround for ES modules since import.meta.url is not available
// in CommonJS output. We'll check if this is the main module by looking at
// process.argv or if the exports are being used.
if (typeof require !== 'undefined' && require.main === module) {
  startServer();
}
