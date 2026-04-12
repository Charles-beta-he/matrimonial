# Multi-Environment Configuration Guide

## Environments

| Env | Purpose | Branch | Auto-deploy |
|-----|---------|--------|-------------|
| **development** | Local development | feature branches | No |
| **staging** | Pre-production testing | `staging` | Yes (on push) |
| **production** | Live users | `main` | Yes (on push) |

## Server (Backend)

Environment is selected via `NODE_ENV`. Config files loaded in order:
1. `.env`
2. `.env.${NODE_ENV}` (e.g., `.env.production`)
3. `.env.local` (gitignored, personal overrides)
4. `.env.${NODE_ENV}.local` (gitignored)

Later files override earlier ones.

### Local development
```bash
cd apps/server
cp .env.development .env.local  # Or just use .env.development directly
NODE_ENV=development pnpm dev
```

### Staging deployment
Secrets injected via K8s Secrets or secret manager. Placeholder values like `__STAGING_JWT_SECRET__` in `.env.staging` are replaced at deploy time.

### Production deployment
Same pattern. All `__PROD_*__` placeholders must be set via secret manager before pods start.

## Mobile (Expo)

Environment is resolved from `EXPO_PUBLIC_ENV` variable, set via EAS Build profile.

### Local development
```bash
cd apps/mobile
pnpm dev  # Automatically uses development config (via __DEV__ flag)
```

### Build for staging
```bash
eas build --profile preview --platform all
```

### Build for production
```bash
eas build --profile production --platform all
```

## Secret Management

**DO NOT commit secrets to git.** All `.env.{environment}` files in the repo contain only placeholders and non-sensitive defaults.

Recommended secret managers:
- **Kubernetes**: K8s Secrets + sealed-secrets
- **Aliyun**: KMS + Secrets Manager
- **Self-hosted**: HashiCorp Vault
- **GitHub Actions**: Repository secrets (for CI/CD only)

## Third-party service activation

All third-party services are opt-in via environment variables. When a service's env vars are missing, the adapter falls back to mock mode. See `apps/server/src/lib/env.ts → isConfigured()`.

| Service | Required env vars | Fallback |
|---------|------------------|----------|
| SMS | `ALIYUN_SMS_ACCESS_KEY_ID`, `ALIYUN_SMS_ACCESS_KEY_SECRET` | Log to console |
| OSS | `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET` | Local `.uploads` folder |
| Real-name | `ALIYUN_VERIFY_APP_CODE` | Format check only |
| Content audit | `ALIYUN_GREEN_*` | Keyword rules |
| WeChat Pay | `WECHAT_APP_ID`, `WECHAT_MCH_ID`, `WECHAT_API_V3_KEY` | Mock success |
| Alipay | `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY` | Mock success |
| JPush | `JPUSH_APP_KEY`, `JPUSH_MASTER_SECRET` | Log only |
| Claude AI | `ANTHROPIC_API_KEY` | Preset responses |
| LiveKit | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Default devkey/secret |

## Database per environment

Each environment has its own database:
- `matrimonial_dev` — local
- `matrimonial_staging` — staging pod
- `matrimonial_prod` — production pod

Migrations run automatically on deploy via `prisma migrate deploy`.
