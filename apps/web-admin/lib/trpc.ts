import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@matrimonial/server/trpc';

export const trpc = createTRPCReact<AppRouter>();
