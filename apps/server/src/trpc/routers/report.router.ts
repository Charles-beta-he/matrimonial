import { createReportSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../base';

export const reportRouter = router({
  /** Submit a report against another user */
  create: protectedProcedure
    .input(createReportSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (input.reportedId === userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot report yourself',
        });
      }

      // Verify reported user exists
      const reportedUser = await ctx.prisma.user.findUnique({
        where: { id: input.reportedId },
        select: { id: true },
      });
      if (!reportedUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reported user not found',
        });
      }

      return ctx.prisma.report.create({
        data: {
          reporterId: userId,
          reportedId: input.reportedId,
          reason: input.reason,
          description: input.description,
          evidence: input.evidence ?? [],
        },
      });
    }),

  /** List reports I have submitted */
  myReports: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.report.findMany({
      where: { reporterId: ctx.user.id },
      include: {
        reported: {
          select: { id: true, nickname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),
});
