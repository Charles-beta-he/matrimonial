#!/bin/bash
# One-command preview deployment helper
# Usage: bash scripts/deploy-preview.sh
# Note: after first checkout, run `chmod +x scripts/deploy-preview.sh` to make executable

set -e

echo "🚀 Matrimonial Preview Deployment Helper"
echo ""

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required"; exit 1; }

if [ ! -f "apps/server/.env.preview" ]; then
  echo "❌ apps/server/.env.preview not found"
  echo "   Copy from template and fill in credentials first"
  exit 1
fi

# Check required env vars
echo "🔍 Checking preview env vars..."
set -a
source apps/server/.env.preview
set +a

MISSING=()
[ -z "$DATABASE_URL" ] && MISSING+=("DATABASE_URL")
[ -z "$REDIS_URL" ] && MISSING+=("REDIS_URL")
[ -z "$JWT_SECRET" ] && MISSING+=("JWT_SECRET")
[ "$JWT_SECRET" = "__CHANGE_ME_RUN_openssl_rand_base64_32__" ] && MISSING+=("JWT_SECRET (still placeholder)")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ Missing required env vars:"
  for var in "${MISSING[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

echo "✅ env vars OK"
echo ""

# Install deps
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build shared package
echo "🔨 Building shared package..."
pnpm --filter @matrimonial/shared build

# Generate Prisma client
echo "🗄  Generating Prisma client..."
pnpm --filter @matrimonial/server db:generate

# Run migrations against Supabase
echo "🗄  Running migrations on Supabase..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @matrimonial/server exec prisma migrate deploy

# Seed demo data
echo "🌱 Seeding demo data..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @matrimonial/server db:seed

echo ""
echo "✅ Database ready!"
echo ""
echo "📋 Next steps:"
echo "  1. Push to GitHub: git push origin main"
echo "  2. Railway will auto-deploy from GitHub (see: railway.toml)"
echo "  3. After Railway deploy, copy the generated URL"
echo "  4. Set EXPO_PUBLIC_API_URL in Vercel project env vars"
echo "  5. Vercel will auto-deploy H5 and Admin"
echo ""
echo "📱 Demo login:"
echo "  Phone: 13800000001"
echo "  Code:  123456"
