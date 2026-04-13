#!/bin/bash
# =============================================================================
# Cloud Dev: 使用 Supabase + Upstash 启动本地开发（无需 Docker）
# =============================================================================
# 用法:
#   chmod +x scripts/dev-cloud.sh
#   bash scripts/dev-cloud.sh
#
# 前提: pnpm 已安装, apps/server/.env.development.local 已配置
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "☁️  Cloud Dev — Supabase + Upstash (no Docker)"
echo "================================================"

# ---------- 前提检查 ----------
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm 未安装 (npm i -g pnpm)"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node 未安装"; exit 1; }

if [ ! -f "apps/server/.env.development.local" ]; then
  echo "❌ 缺少 apps/server/.env.development.local"
  echo "   请先配置 Supabase DATABASE_URL 和 Upstash REDIS_URL"
  exit 1
fi

echo "✅ 前提检查通过"

# ---------- 安装依赖 ----------
echo ""
echo "📦 安装依赖..."
pnpm install

# ---------- Prisma 生成 ----------
echo ""
echo "🔧 生成 Prisma Client..."
pnpm --filter @matrimonial/server exec prisma generate --schema=src/prisma/schema.prisma

# ---------- 检查数据库连接 ----------
echo ""
echo "🔍 检查 Supabase 数据库连接..."
pnpm --filter @matrimonial/server exec prisma db execute --schema=src/prisma/schema.prisma --stdin <<< "SELECT 1;" \
  && echo "✅ 数据库连接正常" \
  || echo "⚠️  数据库连接失败，请检查 DATABASE_URL"

# ---------- 同步 schema（如需要）----------
echo ""
echo "🗄  推送 Prisma schema 到数据库 (如有变更)..."
pnpm --filter @matrimonial/server exec prisma db push --schema=src/prisma/schema.prisma --accept-data-loss 2>&1 \
  || echo "⚠️  Schema push 失败，可能需要手动处理迁移"

# ---------- 启动服务 ----------
echo ""
echo "🚀 启动 API Server + H5..."
echo "   API:  http://localhost:3000"
echo "   H5:   http://localhost:8081"
echo "   健康:  http://localhost:3000/health"
echo ""
echo "📱 演示登录:"
echo "   手机: 13800000001"
echo "   验证码: 123456"
echo ""
echo "================================================"
echo "按 Ctrl+C 停止所有服务"
echo ""

# 用 turbo 并行启动 server + mobile(web)
# turbo dev 会同时启动 apps/server (nest start --watch) 和 apps/mobile (expo start --web)
pnpm turbo dev --filter=@matrimonial/server --filter=@matrimonial/mobile
