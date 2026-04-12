# Single-stage build for pnpm monorepo
# - Uses node:20-slim (Debian glibc) for Prisma binary compatibility
# - Single stage avoids pnpm symlink corruption between COPY --from stages
# - No --frozen-lockfile (lockfile stale due to staged P8 dep additions)

FROM node:20-slim

# System deps for Prisma + HTTPS
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Pin pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy whole monorepo (simplest, most reliable for pnpm workspaces)
COPY . .

# Install all workspace deps
RUN pnpm install --no-frozen-lockfile

# Build shared package FIRST — server runtime imports compiled CJS from
# packages/shared/dist, NOT raw .ts files. Without this step the app boots
# then crashes with ERR_UNSUPPORTED_DIR_IMPORT.
RUN pnpm --filter @matrimonial/shared build

# Generate Prisma client
RUN cd apps/server && pnpm db:generate

# Build the server
RUN pnpm --filter @matrimonial/server build

# Runtime
ENV NODE_ENV=preview
ENV PORT=3000
EXPOSE 3000

# Keep WORKDIR at monorepo root (/app) so relative paths in Start Command
# overrides (Railway, Render, etc.) resolve correctly whether caller uses
# 'node dist/main.js' (relative to apps/server) or the full path below.
WORKDIR /app
CMD ["node", "/app/apps/server/dist/main.js"]
