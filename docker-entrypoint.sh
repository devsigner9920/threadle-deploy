#!/bin/sh
set -e

echo "========================================="
echo "Threadle Docker Container Starting"
echo "========================================="

# Ensure data directory exists
mkdir -p /app/data

# Set database URL if not already set
export DATABASE_URL="${DATABASE_URL:-file:/app/data/threadle.db}"

echo "Database: $DATABASE_URL"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "Database migrations completed successfully"
else
  echo "ERROR: Database migrations failed"
  exit 1
fi

echo "Starting Threadle server..."
echo "Server will be available on port ${PORT:-3000}"
echo "========================================="

# Start the Node.js server
exec node dist/server/index.js
