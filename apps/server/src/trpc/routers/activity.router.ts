import { signupActivitySchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../base';

export const activityRouter = router({
  /** List activities with optional filters */
  list: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          status: z
            .enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = {};
      if (input?.category) where.category = input.category;
      if (input?.status) where.status = input.status;

      const activities = await ctx.prisma.activity.findMany({
        where,
        include: {
          _count: { select: { signups: true } },
        },
        orderBy: { startTime: 'asc' },
      });

      return activities.map((a) => ({
        ...a,
        signupCount: a._count.signups,
        _count: undefined,
      }));
    }),

  /** Get activity detail by ID */
  getById: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const activity = await ctx.prisma.activity.findUnique({
      where: { id: input },
      include: {
        signups: {
          include: {
            // Only expose minimal user info for privacy
          },
        },
        _count: { select: { signups: true } },
      },
    });

    if (!activity) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Activity not found',
      });
    }

    return { ...activity, signupCount: activity._count.signups };
  }),

  /** Sign up for an activity */
  signup: protectedProcedure
    .input(signupActivitySchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const activity = await ctx.prisma.activity.findUnique({
        where: { id: input.activityId },
        include: { _count: { select: { signups: true } } },
      });
      if (!activity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Activity not found',
        });
      }
      if (activity.status !== 'UPCOMING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Activity is not open for signup',
        });
      }

      // Check if already signed up
      const existing = await ctx.prisma.activitySignup.findUnique({
        where: {
          activityId_userId: {
            activityId: input.activityId,
            userId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already signed up for this activity',
        });
      }

      return ctx.prisma.activitySignup.create({
        data: {
          activityId: input.activityId,
          userId,
          status: 'PENDING',
        },
      });
    }),

  /** Cancel signup for an activity */
  cancelSignup: protectedProcedure
    .input(signupActivitySchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const signup = await ctx.prisma.activitySignup.findUnique({
        where: {
          activityId_userId: {
            activityId: input.activityId,
            userId,
          },
        },
      });
      if (!signup) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Signup not found',
        });
      }

      return ctx.prisma.activitySignup.update({
        where: { id: signup.id },
        data: { status: 'CANCELLED' },
      });
    }),

  /** List my signups */
  mySignups: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.activitySignup.findMany({
      where: { userId: ctx.user.id },
      include: {
        activity: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }),
});
