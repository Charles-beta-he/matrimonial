import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { CreditsService } from '../../modules/credits/credits.service';

const consumableKindSchema = z.enum(['SUPER_LIKE', 'LOVE_LETTER', 'VIDEO_TICKET']);

export const creditsRouter = router({
  /** Get current user's credit balance */
  balance: protectedProcedure.query(async ({ ctx }) => {
    return CreditsService.getBalance(ctx.user.id);
  }),

  /** Consume credits for a feature (e.g. super like, love letter) */
  consume: protectedProcedure
    .input(z.object({
      kind: consumableKindSchema,
      amount: z.number().int().min(1).default(1),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await CreditsService.consume(ctx.user.id, input.kind, input.amount, input.reason);
      return CreditsService.getBalance(ctx.user.id);
    }),

  /** Check if user has active boost */
  isBoostActive: protectedProcedure.query(async ({ ctx }) => {
    return { active: await CreditsService.isBoostActive(ctx.user.id) };
  }),

  /** Get transaction history */
  history: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const items = await ctx.prisma.creditTransaction.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });
      const hasMore = items.length > input.limit;
      return {
        items: items.slice(0, input.limit),
        nextCursor: hasMore ? items[input.limit - 1].id : undefined,
      };
    }),
});
