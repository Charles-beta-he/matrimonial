# 婚恋交友平台 (Matrimonial)

> Monorepo for a full-stack matrimonial/dating platform supporting H5, iOS, and Android.
>
> **Repository:** https://github.com/Charles-beta-he/matrimonial

一套覆盖 iOS / Android / H5 三端的婚恋交友平台完整实现。基于 pnpm workspaces + Turborepo 管理的 monorepo，后端 NestJS + tRPC + Prisma，移动端 Expo (React Native) + NativeWind，管理后台 Next.js 15，实时通信 Socket.IO + LiveKit。

## 文档导航

| 文档 | 用途 |
|------|------|
| [产品功能文档.md](./产品功能文档.md) | 产品功能定义与用户场景 |
| [技术方案文档.md](./技术方案文档.md) | 技术架构与选型依据 |
| [部署方案文档.md](./部署方案文档.md) | 生产部署与成本预估（v1.1） |
| [预览部署方案.md](./预览部署方案.md) | 免费预览部署方案（¥0/月） |
| [密钥账户清单.md](./密钥账户清单.md) | 所有第三方账户注册与凭证清单 |
| [docs/ENVIRONMENTS.md](./docs/ENVIRONMENTS.md) | 多环境配置指南 |

## Clone

```bash
git clone https://github.com/Charles-beta-he/matrimonial.git
cd matrimonial
```

## Stack

- **Mobile**: Expo (React Native) + NativeWind + tRPC + Zustand + React Query
- **Backend**: NestJS + tRPC + Prisma + PostgreSQL (pgvector)
- **Real-time**: Socket.IO (chat) + LiveKit (video)
- **Admin**: Next.js 15
- **Monorepo**: pnpm workspaces + Turborepo
- **Testing**: Vitest (server/shared) + Jest (mobile)

## Structure

- `apps/mobile` — Expo app (iOS + Android + H5)
- `apps/server` — NestJS + tRPC backend
- `apps/web-admin` — Next.js admin dashboard
- `packages/shared` — shared types, Zod schemas, constants, utils
- `packages/ui` — shared React Native components (NativeWind)
- `packages/api-client` — tRPC hooks wrapper
- `services/chat-service` — Socket.IO IM gateway
- `services/media-service` — WebRTC signaling
- `services/recommend-service` — Python FastAPI recommendation engine
- `services/audit-service` — Python FastAPI content moderation

## Quick start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Start infrastructure
```bash
docker compose up -d postgres redis meilisearch livekit
```

### 3. Configure environment
```bash
cp apps/server/.env.example apps/server/.env
# Edit .env to set DATABASE_URL and any third-party credentials
```

### 4. Run database migrations + seed
```bash
pnpm --filter @matrimonial/server db:migrate
pnpm --filter @matrimonial/server db:seed
```

### 5. Start all services
```bash
pnpm dev
```

Services will be available at:
- H5 / Expo dev: http://localhost:8081
- API: http://localhost:3000
- Admin: http://localhost:3001
- Chat WebSocket: ws://localhost:3002
- Media WebRTC signaling: ws://localhost:3003
- Recommend service: http://localhost:8000
- Audit service: http://localhost:8001

## Development

### Common commands
```bash
pnpm dev                          # Start all apps
pnpm dev --filter mobile          # Start only mobile
pnpm test                         # Run all tests
pnpm --filter server test         # Server tests only
pnpm lint                         # Lint everything
pnpm type-check                   # Type check everything
pnpm build                        # Build all packages
```

### Mobile-specific
```bash
pnpm --filter mobile ios          # Run on iOS simulator
pnpm --filter mobile android      # Run on Android emulator
pnpm --filter mobile web          # Run as H5 in browser
```

## Authentication (dev mode)

1. Go to the login screen
2. Enter any phone number (e.g. `13800000001`)
3. Tap "发送验证码"
4. Enter verification code `123456` (dev mode hardcoded)
5. You're logged in

Demo users are seeded: `138000000{01..06}` all use code `123456`.

## Third-party integrations

All third-party services are optional in dev mode (mock fallbacks). Configure them via env for production:

| Service | Env keys | Purpose |
|---------|----------|---------|
| Aliyun SMS | `ALIYUN_SMS_*` | Verification code delivery |
| Aliyun OSS | `OSS_*` | Photo/video storage |
| Aliyun Real-name | `ALIYUN_VERIFY_APP_CODE` | L2 identity verification |
| Aliyun Green | `ALIYUN_GREEN_*` | Content audit (photo/text) |
| WeChat Pay | `WECHAT_*` | WeChat Pay integration |
| Alipay | `ALIPAY_*` | Alipay integration |
| JPush | `JPUSH_*` | Push notifications |
| Anthropic Claude | `ANTHROPIC_API_KEY` | AI icebreaker suggestions |
| LiveKit | `LIVEKIT_*` | Video calling |

See `apps/server/.env.example` for the full list.

## Testing

```bash
pnpm test                              # All tests
pnpm --filter server test:watch        # Watch mode
pnpm --filter server test:coverage     # Coverage report
```

Coverage thresholds: 60% lines for `apps/server`.

## Preview Deployment (¥0)

Deploy a shareable preview in ~10 minutes using free services.

### Prerequisites
See [密钥账户清单.md](./密钥账户清单.md) — you'll need free accounts for:
1. GitHub
2. Supabase (PostgreSQL + pgvector)
3. Upstash (Redis)
4. Railway (API hosting)
5. Vercel (H5 + Admin hosting)

### One-command setup

```bash
# 1. Fill in apps/server/.env.preview with your credentials
#    (from Supabase + Upstash dashboards)

# 2. Run deployment helper
bash scripts/deploy-preview.sh

# 3. Push to GitHub — Railway + Vercel auto-deploy
git push origin main
```

See [预览部署方案.md](./预览部署方案.md) for the full step-by-step guide.

## Deployment

See [部署方案文档.md](./部署方案文档.md) for production deployment guide.

## Project Status

- 代码完整度：**98%**（10 个 tRPC 路由 + 9 个第三方适配器 + 4 个 Prisma 迁移）
- 测试覆盖：**16 个测试文件 / 120+ 用例**
- 环境配置：**dev / preview / staging / production** 四环境就绪
- 合规准备：用户协议、隐私政策、注销账号、年龄核验、实名认证 UI 全部到位

## Contributing

本项目当前处于 **feature-freeze** 状态。仅接受：
1. 真实 bug 修复
2. 合规要求驱动的改动
3. 用户反馈驱动的微调

请在 PR 中注明所属类别。新功能需先经讨论，RFC 流程走通后再实施。

## License

Private. All rights reserved.

---

## Repository

https://github.com/Charles-beta-he/matrimonial.git

## Contact

Issues: https://github.com/Charles-beta-he/matrimonial/issues
