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

  /** Vote for another participant after activity */
  vote: protectedProcedure
    .input(
      z.object({
        activityId: z.string(),
        votedId: z.string(),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify activity is COMPLETED
      const activity = await ctx.prisma.activity.findUnique({
        where: { id: input.activityId },
      });
      if (!activity || activity.status !== 'COMPLETED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '活动尚未结束，无法投票',
        });
      }

      // Verify both users signed up for this activity
      const [mySignup, theirSignup] = await Promise.all([
        ctx.prisma.activitySignup.findUnique({
          where: {
            activityId_userId: {
              activityId: input.activityId,
              userId,
            },
          },
        }),
        ctx.prisma.activitySignup.findUnique({
          where: {
            activityId_userId: {
              activityId: input.activityId,
              userId: input.votedId,
            },
          },
        }),
      ]);
      if (!mySignup || !theirSignup) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '只能为同场活动参与者投票',
        });
      }

      // Can't vote for yourself
      if (input.votedId === userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '不能给自己投票',
        });
      }

      // Create or update vote
      const vote = await ctx.prisma.activityVote.upsert({
        where: {
          activityId_voterId_votedId: {
            activityId: input.activityId,
            voterId: userId,
            votedId: input.votedId,
          },
        },
        create: {
          activityId: input.activityId,
          voterId: userId,
          votedId: input.votedId,
          rating: input.rating,
        },
        update: { rating: input.rating },
      });

      // Check for mutual vote (both rated >= 3)
      const reciprocalVote = await ctx.prisma.activityVote.findUnique({
        where: {
          activityId_voterId_votedId: {
            activityId: input.activityId,
            voterId: input.votedId,
            votedId: userId,
          },
        },
      });

      let conversationId: string | null = null;
      if (reciprocalVote && reciprocalVote.rating >= 3 && input.rating >= 3) {
        // Mutual attraction — check if conversation already exists between them
        const existingConv = await ctx.prisma.conversationParticipant.findMany({
          where: { userId },
          select: { conversationId: true },
        });
        const existingConvIds = existingConv.map((c) => c.conversationId);
        const mutual = existingConvIds.length
          ? await ctx.prisma.conversationParticipant.findFirst({
              where: {
                userId: input.votedId,
                conversationId: { in: existingConvIds },
              },
            })
          : null;

        if (!mutual) {
          // Create conversation with system message
          const conversation = await ctx.prisma.conversation.create({
            data: {
              lastMessageAt: new Date(),
              participants: {
                create: [{ userId }, { userId: input.votedId }],
              },
              messages: {
                create: {
                  senderId: userId,
                  type: 'SYSTEM',
                  content: `你们在「${activity.title}」活动中互相欣赏，开始聊天吧！`,
                },
              },
            },
          });
          conversationId = conversation.id;
        }
      }

      return { vote, isMutual: !!conversationId, conversationId };
    }),

  /** Get participants available to vote for in a completed activity */
  votableParticipants: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const signups = await ctx.prisma.activitySignup.findMany({
        where: {
          activityId: input.activityId,
          status: { not: 'CANCELLED' },
          userId: { not: userId },
        },
      });

      // Get user details for participants
      const userIds = signups.map((s) => s.userId);
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          nickname: true,
          gender: true,
          birthday: true,
          city: true,
          photos: {
            where: { auditStatus: 'APPROVED', isAvatar: true },
            take: 1,
          },
        },
      });

      // Get my existing votes for this activity
      const myVotes = await ctx.prisma.activityVote.findMany({
        where: { activityId: input.activityId, voterId: userId },
      });
      const votedMap = new Map(myVotes.map((v) => [v.votedId, v.rating]));

      return users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        gender: u.gender,
        birthday: u.birthday,
        city: u.city,
        avatarUrl: u.photos[0]?.url ?? null,
        myRating: votedMap.get(u.id) ?? null,
      }));
    }),

  /** Get my mutual matches from activities */
  activityMatches: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Find votes where I voted >= 3 AND they voted me >= 3
    const myVotes = await ctx.prisma.activityVote.findMany({
      where: { voterId: userId, rating: { gte: 3 } },
    });

    const mutuals = [];
    for (const vote of myVotes) {
      const reciprocal = await ctx.prisma.activityVote.findUnique({
        where: {
          activityId_voterId_votedId: {
            activityId: vote.activityId,
            voterId: vote.votedId,
            votedId: userId,
          },
        },
      });
      if (reciprocal && reciprocal.rating >= 3) {
        mutuals.push({ activityId: vote.activityId, userId: vote.votedId });
      }
    }

    // Enrich with user + activity details in batch
    const uniqueUserIds = [...new Set(mutuals.map((m) => m.userId))];
    const [users, activities] = await Promise.all([
      ctx.prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: {
          id: true,
          nickname: true,
          birthday: true,
          city: true,
          photos: { where: { isAvatar: true }, take: 1, select: { url: true } },
        },
      }),
      ctx.prisma.activity.findMany({
        where: { id: { in: mutuals.map((m) => m.activityId) } },
        select: { id: true, title: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    return mutuals.map((m) => ({
      activityId: m.activityId,
      activityTitle: activityMap.get(m.activityId)?.title ?? null,
      user: userMap.get(m.userId) ?? null,
    }));
  }),
});
