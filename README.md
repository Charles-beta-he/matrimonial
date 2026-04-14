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

## 运营管理后台

运营管理后台位于 `apps/web-admin`（Next.js 15 + tRPC），端口 `3001`。所有页面（仪表盘 / 用户 / 审核 / 活动 / 红娘 / 推送）均通过 `adminRouter` 从真实后端读取数据。

### 启动

```bash
# 1. 确保后端和数据库已就绪
pnpm --filter @matrimonial/server db:migrate   # 应用最新 schema（包含 admin_ops 迁移）
pnpm --filter @matrimonial/server db:seed      # 种入默认 ADMIN 用户和运营数据
pnpm --filter @matrimonial/server dev

# 2. 启动 web-admin
cp apps/web-admin/.env.example apps/web-admin/.env.local   # 如需自定义 API URL
pnpm --filter @matrimonial/web-admin dev
```

访问 http://localhost:3001，未登录会重定向到 `/login`。

### 默认管理员账号

Seed 脚本会写入一个 `role = ADMIN` 的用户：

| 字段 | 值 |
|------|----|
| 手机号 | `13800000001` |
| 昵称   | `管理员` |
| 验证码 | `123456`（开发环境硬编码，见 `apps/server/src/modules/auth/auth.service.ts`） |

生产环境请在 `auth.service.ts` 中启用真实短信通道，并手动将某位用户的 `role` 字段改为 `ADMIN`。

### Seed 内容概览

`pnpm --filter @matrimonial/server db:seed` 幂等写入：

- 1 个 ADMIN 用户 + 10 个普通用户（其中 2 个 `BANNED`）
- 6 张 `PENDING` 审核照片
- 4 条 `PENDING` 文本审核（消息/简介/昵称）
- 5 条 `PENDING / REVIEWING` 举报
- 6 个红娘（`MATCHMAKER` 角色用户 + `Matchmaker` 业务记录）
- 6 个活动（`UPCOMING / ONGOING / COMPLETED` 混合）
- 5 条历史推送（`PushCampaign`，含 delivered/opened 统计）

### 功能一览

- **数据仪表盘**：DAU、新增、付费、审核队列
- **用户管理**：搜索 / 封禁 / 解封
- **内容审核**：照片、文本、举报三个 PENDING 队列
- **活动管理**：创建 / 上下架 / 报名情况
- **红娘管理**：业绩、在线状态
- **推送管理**：创建 / 立即发送 / 历史送达率

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
