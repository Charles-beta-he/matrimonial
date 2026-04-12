import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@matrimonial/server/trpc';

/** tRPC 客户端初始化（类型由 apps/server 的 AppRouter 推导） */
export const api = createTRPCReact<AppRouter>();
