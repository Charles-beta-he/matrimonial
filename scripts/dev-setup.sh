#!/bin/bash
# One-command dev environment setup
#
# NOTE: After checkout, this script needs to be made executable:
#   chmod +x scripts/dev-setup.sh
# Then run via: pnpm setup  (or: bash scripts/dev-setup.sh)

set -e

echo "🚀 Setting up matrimonial dev environment..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ docker not installed"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not installed"; exit 1; }

# Install deps
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Start infrastructure
echo "🐳 Starting infrastructure..."
docker compose up -d postgres redis meilisearch livekit

# Wait for postgres to be ready
echo "⏳ Waiting for postgres..."
until docker compose exec -T postgres pg_isready -U matrimonial >/dev/null 2>&1; do
  sleep 1
done

# Setup env
if [ ! -f "apps/server/.env" ]; then
  echo "📝 Copying .env.development to .env..."
  cp apps/server/.env.development apps/server/.env
fi

# Run migrations
echo "🗄  Running database migrations..."
pnpm --filter @matrimonial/server db:migrate || echo "⚠️  Migration failed — may need manual setup"

# Seed data
echo "🌱 Seeding demo data..."
pnpm --filter @matrimonial/server db:seed || echo "⚠️  Seed failed"

echo ""
echo "✅ Setup complete! Start dev servers with:"
echo "  pnpm dev"
echo ""
echo "📱 Demo login:"
echo "  Phone: 13800000001"
echo "  Code: 123456"
