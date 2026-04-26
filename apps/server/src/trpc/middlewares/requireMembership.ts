import { TRPCError } from '@trpc/server';
import { Membership } from '@prisma/client';
import { protectedProcedure } from '../base';

/** Numeric rank for each plan — higher = better */
const PLAN_RANK: Record<Membership, number> = {
  FREE: 0,
  MONTHLY: 1,
  QUARTERLY: 2,
  YEARLY: 3,
};

/**
 * Returns a tRPC procedure builder that extends `protectedProcedure` with a
 * server-side membership gate.  Fresh DB read on every call (no cache).
 *
 * Throws FORBIDDEN with a user-friendly Chinese message when the caller's
 * active plan ranks below `minPlan` or the membership has expired.
 */
export function requireMembership(minPlan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { membership: true, membershipExpiry: true },
    });

    const plan: Membership = user?.membership ?? 'FREE';
    const expiry = user?.membershipExpiry;

    const isExpired = expiry !== null && expiry !== undefined && expiry < new Date();
    const effectivePlan: Membership = isExpired ? 'FREE' : plan;

    if (PLAN_RANK[effectivePlan] < PLAN_RANK[minPlan]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '会员功能 · 升级解锁',
      });
    }

    return next({ ctx });
  });
}
