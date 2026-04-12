import { likeSchema, skipSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../base';
import { RecommendAdapter } from '../../adapters/recommend.adapter';
import { CreditsService } from '../../modules/credits/credits.service';

export const matchRouter = router({
  /**
   * Get recommendation list — users matching preferences,
   * excluding already liked/skipped, ordered by lastActiveAt desc.
   */
  recommendations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // First try Python recommend service
    const remote = await RecommendAdapter.getRecommendations(userId, 20);
    if (remote.length > 0) {
      const ids = remote.map((r) => r.userId);
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: ids } },
        include: {
          photos: {
            where: { auditStatus: 'APPROVED' },
            orderBy: { order: 'asc' },
          },
          tags: true,
          prompts: { orderBy: { order: 'asc' } },
        },
      });
      // Preserve ordering from the recommend service
      const order = new Map(ids.map((id, idx) => [id, idx]));
      users.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      if (users.length > 0) return users;
    }

    // Fallback: local DB filtering by preferences
    // Get current user's preferences
    const preferences = await ctx.prisma.preference.findUnique({
      where: { userId },
    });

    // Get IDs of users already interacted with (liked or skipped)
    const existingLikes = await ctx.prisma.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    });
    const excludeIds = [userId, ...existingLikes.map((l) => l.toUserId)];

    // Build filter conditions from preferences
    const where: Record<string, unknown> = {
      id: { notIn: excludeIds },
    };

    if (preferences) {
      if (preferences.cities.length > 0) {
        where.city = { in: preferences.cities };
      }
      if (preferences.heightMin || preferences.heightMax) {
        where.height = {};
        if (preferences.heightMin)
          (where.height as Record<string, unknown>).gte = preferences.heightMin;
        if (preferences.heightMax)
          (where.height as Record<string, unknown>).lte = preferences.heightMax;
      }
      if (preferences.educationMin) {
        const eduOrder = [
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'PHD',
        ];
        const minIdx = eduOrder.indexOf(preferences.educationMin);
        where.education = { in: eduOrder.slice(minIdx) };
      }
    }

    // Get current user to determine opposite gender
    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    if (currentUser) {
      where.gender = currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE';
    }

    return ctx.prisma.user.findMany({
      where,
      include: {
        photos: {
          where: { auditStatus: 'APPROVED' },
          orderBy: { order: 'asc' },
        },
        tags: true,
        prompts: { orderBy: { order: 'asc' } },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    });
  }),

  /** Like a user — creates Like record; checks for mutual match */
  like: protectedProcedure
    .input(likeSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (input.toUserId === userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot like yourself',
        });
      }

      // Verify target user exists
      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: input.toUserId },
        select: { id: true },
      });
      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target user not found',
        });
      }

      // Check if the other person already liked us
      const reciprocalLike = await ctx.prisma.like.findUnique({
        where: {
          fromUserId_toUserId: {
            fromUserId: input.toUserId,
            toUserId: userId,
          },
        },
      });

      const isMatched = !!reciprocalLike;

      // Consume a super like credit if this is a SUPER like
      if (input.type === 'SUPER') {
        await CreditsService.consume(userId, 'SUPER_LIKE', 1, 'match_like');
      }

      // Create the like record
      const like = await ctx.prisma.like.upsert({
        where: {
          fromUserId_toUserId: {
            fromUserId: userId,
            toUserId: input.toUserId,
          },
        },
        create: {
          fromUserId: userId,
          toUserId: input.toUserId,
          type: input.type,
          promptId: input.promptId,
          comment: input.comment,
          isMatched,
        },
        update: {
          type: input.type,
          promptId: input.promptId,
          comment: input.comment,
          isMatched,
        },
      });

      // If mutual match, update the reciprocal like and create a conversation
      let conversationId: string | null = null;
      if (isMatched && reciprocalLike) {
        await ctx.prisma.like.update({
          where: { id: reciprocalLike.id },
          data: { isMatched: true },
        });

        // Create a conversation for the matched pair
        const conversation = await ctx.prisma.conversation.create({
          data: {
            lastMessageAt: new Date(),
            participants: {
              create: [{ userId }, { userId: input.toUserId }],
            },
          },
        });
        conversationId = conversation.id;
      }

      return { like, isMatched, conversationId };
    }),

  /** Skip/pass a user — records interaction so they are excluded from recommendations */
  skip: protectedProcedure
    .input(skipSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Create a NORMAL like with isMatched=false as a skip marker
      // The recommendations query excludes any user with an existing Like
      return ctx.prisma.like.upsert({
        where: {
          fromUserId_toUserId: {
            fromUserId: userId,
            toUserId: input.toUserId,
          },
        },
        create: {
          fromUserId: userId,
          toUserId: input.toUserId,
          type: 'NORMAL',
          isMatched: false,
        },
        update: {}, // No-op if already exists
      });
    }),

  /** Get users who liked me but I haven't acted on */
  likedMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get IDs I have already interacted with
    const myLikes = await ctx.prisma.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    });
    const actedOnIds = myLikes.map((l) => l.toUserId);

    return ctx.prisma.like.findMany({
      where: {
        toUserId: userId,
        fromUserId: { notIn: actedOnIds },
      },
      include: {
        fromUser: {
          include: {
            photos: {
              where: { auditStatus: 'APPROVED' },
              orderBy: { order: 'asc' },
              take: 1,
            },
            tags: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /** Get all mutual matches */
  matches: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return ctx.prisma.like.findMany({
      where: {
        isMatched: true,
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: {
          include: {
            photos: {
              where: { auditStatus: 'APPROVED' },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        toUser: {
          include: {
            photos: {
              where: { auditStatus: 'APPROVED' },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /** Daily picks — 5 random high-quality users */
  dailyPicks: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });

    // Get existing interactions to exclude
    const existingLikes = await ctx.prisma.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    });
    const excludeIds = [userId, ...existingLikes.map((l) => l.toUserId)];

    // Find verified, active users of the opposite gender
    const candidates = await ctx.prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        gender: currentUser?.gender === 'MALE' ? 'FEMALE' : 'MALE',
        verificationLevel: { in: ['L2', 'L3', 'L4'] },
      },
      include: {
        photos: {
          where: { auditStatus: 'APPROVED' },
          orderBy: { order: 'asc' },
        },
        tags: true,
        prompts: { orderBy: { order: 'asc' } },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 50,
    });

    // Shuffle and pick top 5
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }),

  /** Get current user's credit balance */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    return CreditsService.getBalance(ctx.user.id);
  }),
});
