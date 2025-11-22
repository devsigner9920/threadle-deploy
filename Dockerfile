# Threadle Dockerfile
# Multi-stage build for optimized Docker image

# ============================================
# Stage 1: Builder - Build TypeScript and React
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies for both server and client (ignore scripts to prevent prepublish)
RUN npm ci --legacy-peer-deps --ignore-scripts && cd client && npm ci

# Copy source code and configuration files
COPY . .

# Set temporary DATABASE_URL for Prisma generate (will be overridden at runtime)
ENV DATABASE_URL="file:/app/data/threadle.db"

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript server
RUN npm run build:server

# Build React client
RUN npm run build:client

# ============================================
# Stage 2: Runtime - Minimal production image
# ============================================
FROM node:20-alpine AS runtime

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S threadle && \
    adduser -S threadle -u 1001 -G threadle

# Copy package files
COPY package*.json ./

# Install all dependencies (with legacy peer deps and ignore scripts)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema, config, and migrations
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Copy prompts directory
COPY prompts ./prompts

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory and set permissions
RUN mkdir -p /app/data && \
    chown -R threadle:threadle /app

# Switch to non-root user
USER threadle

# Expose port 3000
EXPOSE 3000

# Define volume for persistent data
VOLUME ["/app/data"]

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="file:/app/data/threadle.db"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Run entrypoint script
CMD ["./docker-entrypoint.sh"]
