import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../base';
import { AIAdapter } from '../../adapters/ai.adapter';

export const aiRouter = router({
  /** Generate icebreaker suggestions for a new match */
  icebreakers: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [self, target] = await Promise.all([
        ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          include: { tags: true },
        }),
        ctx.prisma.user.findUnique({
          where: { id: input.targetUserId },
          include: { tags: true },
        }),
      ]);

      if (!self || !target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' });
      }

      const calcAge = (d: Date) =>
        Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      const suggestions = await AIAdapter.generateIcebreakers(
        {
          age: calcAge(self.birthday),
          gender: self.gender,
          bio: self.bio,
          tags: self.tags.map((t) => t.tag),
        },
        {
          age: calcAge(target.birthday),
          gender: target.gender,
          bio: target.bio,
          tags: target.tags.map((t) => t.tag),
        },
      );

      return { suggestions };
    }),

  /** Evaluate a prompt answer quality */
  evaluatePrompt: protectedProcedure
    .input(z.object({ question: z.string(), answer: z.string() }))
    .mutation(async ({ input }) => {
      return AIAdapter.evaluatePromptAnswer(input.question, input.answer);
    }),
});
