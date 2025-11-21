/**
 * Static Files Middleware
 * Serves the built React SPA and handles client-side routing
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Configure Express to serve static client files
 * and handle SPA routing (all non-API routes serve index.html)
 */
export function configureStaticFiles(app: Express): void {
  // Determine client dist directory
  // Resolve relative to the project root (where package.json is)
  const clientDistPath = path.resolve(process.cwd(), 'client/dist');

  // Check if client dist exists
  if (fs.existsSync(clientDistPath)) {
    console.error(`Serving static files from: ${clientDistPath}`);

    // Serve static assets with caching
    app.use(
      express.static(clientDistPath, {
        maxAge: '1d', // Cache static assets for 1 day
        etag: true,
        lastModified: true,
      })
    );

    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API and config routes
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/config/') ||
        req.path.startsWith('/health')
      ) {
        return next();
      }

      // Serve index.html for all other routes (client-side routing)
      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Client application not found. Please build the client app first.');
      }
    });
  } else {
    console.error('Warning: Client dist directory not found. Run "npm run build" in client/ directory.');
  }
}

/**
 * Static files middleware export (for use with app.use())
 */
export const staticFilesMiddleware = express.Router();

// Apply static files configuration to the router
const clientDistPath = path.resolve(process.cwd(), 'client/dist');
if (fs.existsSync(clientDistPath)) {
  staticFilesMiddleware.use(
    express.static(clientDistPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
    })
  );

  staticFilesMiddleware.get("*", (_req: Request, res: Response) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Client application not found.');
    }
  });
}
