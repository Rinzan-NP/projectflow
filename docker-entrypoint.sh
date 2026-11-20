#!/bin/sh
set -e

echo "🚀 Starting ProjectFlow..."

# Ensure data and uploads directories exist
mkdir -p /app/data
mkdir -p /app/public/uploads

# Run Prisma schema push to ensure database & tables exist
echo "📦 Syncing database schema to SQLite (/app/data/dev.db)..."
DATABASE_URL="file:/app/data/dev.db" npx prisma db push --skip-generate

# Only seed if explicitly requested via environment variable SEED_DB=true
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 SEED_DB is true: Seeding demo projects and items..."
  DATABASE_URL="file:/app/data/dev.db" npx tsx prisma/seed.ts || true
else
  echo "✨ Starting with a clean, empty database."
fi

echo "✨ Database ready! Starting server on port $PORT..."
exec "$@"
