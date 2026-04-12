#!/bin/bash
# Verify a preview deployment is working
# Usage: bash scripts/verify-preview.sh https://your-api.up.railway.app
# Note: after first checkout, run `chmod +x scripts/verify-preview.sh` to make executable

set -e

API_URL="${1:-http://localhost:3000}"

echo "🔍 Verifying preview at $API_URL"
echo ""

# Health check
echo "⏳ Health check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$CODE" = "200" ]; then
  echo "✅ Health check OK"
  echo "   Response: $BODY"
else
  echo "❌ Health check failed (HTTP $CODE)"
  exit 1
fi

echo ""

# tRPC query test (public endpoint)
echo "⏳ tRPC endpoint test..."
TRPC_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/trpc/user.me")
TRPC_CODE=$(echo "$TRPC_RESPONSE" | tail -n 1)

if [ "$TRPC_CODE" = "200" ] || [ "$TRPC_CODE" = "401" ]; then
  echo "✅ tRPC endpoint reachable (HTTP $TRPC_CODE)"
else
  echo "❌ tRPC endpoint failed (HTTP $TRPC_CODE)"
  exit 1
fi

echo ""
echo "🎉 Preview deployment verified!"
echo ""
echo "📱 Test login:"
echo "  1. Open your Vercel URL in browser"
echo "  2. Phone: 13800000001"
echo "  3. Code:  123456"
