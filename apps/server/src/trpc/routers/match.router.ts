import { feedbackSignalSchema, likeSchema, skipSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { RecommendAdapter } from '../../adapters/recommend.adapter';
import { CreditsService } from '../../modules/credits/credits.service';
import { NotificationService } from '../../modules/notification/notification.module';
import { logger } from '../../lib/logger';

// ── Daily picks in-memory cache ──
// Key: `${userId}-${YYYY-MM-DD}`, Value: { users, expireAt }
const dailyPicksCache = new Map<
  string,
  { users: unknown[]; expireAt: number }
>();

/** Purge expired entries (runs lazily on each access) */
function purgeDailyPicksCache() {
  const now = Date.now();
  for (const [key, entry] of dailyPicksCache) {
    if (entry.expireAt <= now) dailyPicksCache.delete(key);
  }
}

/** Get today's date string in YYYY-MM-DD */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Free user daily swipe quota ──
const FREE_DAILY_SWIPES = 30;

export const matchRouter = router({
  /**
   * Get recommendation list — users matching preferences,
   * excluding already liked/skipped, ordered with exposure fairness.
   *
   * Returns { users, meta, quotaExhausted }.
   * `meta` maps userId → { score, reason } when data comes from Python service.
   */
  recommendations: protectedProcedure
    .input(
      z
        .object({
          filters: z
            .object({
              heightMin: z.number().int().optional(),
              heightMax: z.number().int().optional(),
              educationMin: z
                .enum([
                  'HIGH_SCHOOL',
                  'ASSOCIATE',
                  'BACHELOR',
                  'MASTER',
                  'PHD',
                ])
                .optional(),
              incomeRange: z
                .array(
                  z.enum([
                    'BELOW_5K',
                    'K5_10',
                    'K10_20',
                    'K20_50',
                    'ABOVE_50K',
                  ]),
                )
                .optional(),
              zodiac: z.array(z.string()).optional(),
              mbti: z
                .array(
                  z.enum([
                    'INTJ', 'INTP', 'ENTJ', 'ENTP',
                    'INFJ', 'INFP', 'ENFJ', 'ENFP',
                    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
                    'ISTP', 'ISFP', 'ESTP', 'ESFP',
                  ]),
                )
                .optional(),
              occupation: z.string().optional(),
              verificationLevel: z
                .array(z.enum(['L1', 'L2', 'L3', 'L4']))
                .optional(),
              ageMin: z.number().int().optional(),
              ageMax: z.number().int().optional(),
              cities: z.array(z.string()).optional(),
            })
            .optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    // ── Task 4: Check quota for free users ──
    const currentUserForQuota = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { membership: true },
    });

    const isFreeUser =
      !currentUserForQuota?.membership ||
      currentUserForQuota.membership === 'FREE';

    if (isFreeUser) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const swipeCount = await ctx.prisma.like.count({
        where: {
          fromUserId: userId,
          createdAt: { gte: todayStart },
        },
      });

      if (swipeCount >= FREE_DAILY_SWIPES) {
        return {
          users: [],
          meta: {} as Record<string, { score: number; reason?: string }>,
          quotaExhausted: true,
        };
      }
    }

    // ── Task 1: Try Python recommend service, attach _recommendMeta ──
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

      if (users.length > 0) {
        // Build meta map from Python service response
        const meta: Record<string, { score: number; reason?: string }> = {};
        for (const r of remote) {
          meta[r.userId] = { score: r.score, reason: r.reason };
        }

        // Attach _recommendMeta to each user object
        const usersWithMeta = users.map((u) => ({
          ...u,
          _recommendMeta: meta[u.id] ?? null,
        }));

        return { users: usersWithMeta, meta, quotaExhausted: false };
      }
    }

    // ── Fallback: local DB filtering by preferences ──
    const preferences = await ctx.prisma.preference.findUnique({
      where: { userId },
    });

    const existingLikes = await ctx.prisma.like.findMany({
      where: { fromUserId: userId, type: { not: 'SKIP' } },
      select: { toUserId: true },
    });
    const excludeIds = [userId, ...existingLikes.map((l) => l.toUserId)];

    // ── Blocked contacts filtering ──
    const currentUserPrivacy = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { blockedPhoneHashes: true },
    });
    const blockedHashes = currentUserPrivacy?.blockedPhoneHashes ?? [];

    // If user has blocked contacts, find users whose phone hash is in the blocked list
    let blockedUserIds: string[] = [];
    if (blockedHashes.length > 0) {
      // We need to hash-match against user phones; blockedPhoneHashes stores SHA256 of contact phones
      // Find users whose phone (hashed) matches any blocked hash
      // Since we store raw phones in User.phone, we do a raw query to compare
      // For now, we store blocked phone hashes client-side and match against them
      // The simplest approach: find all users, but that's expensive.
      // Instead, we'll use Prisma raw query to do SHA256 comparison in Postgres.
      const blocked = await ctx.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "User" WHERE encode(digest(phone, 'sha256'), 'hex') = ANY($1)`,
        blockedHashes,
      );
      blockedUserIds = blocked.map((u) => u.id);
    }

    const allExcludeIds = [...excludeIds, ...blockedUserIds];

    const where: Record<string, unknown> = {
      id: { notIn: allExcludeIds },
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

    // ── Advanced filters (override preferences when provided) ──
    const filters = input?.filters;
    if (filters) {
      // Check membership for advanced filters (income, zodiac, mbti, occupation)
      const hasAdvancedFilters =
        filters.incomeRange || filters.zodiac || filters.mbti || filters.occupation;
      if (hasAdvancedFilters) {
        const userForMembership = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { membership: true },
        });
        if (
          !userForMembership?.membership ||
          userForMembership.membership === 'FREE'
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '高级筛选需要会员权限',
          });
        }
      }

      if (filters.heightMin || filters.heightMax) {
        where.height = {};
        if (filters.heightMin)
          (where.height as Record<string, unknown>).gte = filters.heightMin;
        if (filters.heightMax)
          (where.height as Record<string, unknown>).lte = filters.heightMax;
      }
      if (filters.educationMin) {
        const eduOrder = [
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'PHD',
        ];
        const minIdx = eduOrder.indexOf(filters.educationMin);
        where.education = { in: eduOrder.slice(minIdx) };
      }
      if (filters.incomeRange?.length)
        where.incomeRange = { in: filters.incomeRange };
      if (filters.zodiac?.length) where.zodiac = { in: filters.zodiac };
      if (filters.mbti?.length) where.mbti = { in: filters.mbti };
      if (filters.occupation)
        where.occupation = { contains: filters.occupation, mode: 'insensitive' };
      if (filters.verificationLevel?.length)
        where.verificationLevel = { in: filters.verificationLevel };
      if (filters.ageMin || filters.ageMax) {
        const now = new Date();
        if (filters.ageMax)
          where.birthday = {
            ...(where.birthday as Record<string, unknown>),
            gte: new Date(
              now.getFullYear() - filters.ageMax,
              now.getMonth(),
              now.getDate(),
            ),
          };
        if (filters.ageMin)
          where.birthday = {
            ...(where.birthday as Record<string, unknown>),
            lte: new Date(
              now.getFullYear() - filters.ageMin,
              now.getMonth(),
              now.getDate(),
            ),
          };
      }
      if (filters.cities?.length) where.city = { in: filters.cities };
    }

    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    if (currentUser) {
      where.gender = currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE';
    }

    // ── Task 3: Exposure fairness — fetch 50, weighted-random shuffle, return 20 ──
    const candidates = await ctx.prisma.user.findMany({
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
      take: 50,
    });

    const fairUsers = weightedRandomShuffle(candidates, 20);

    return {
      users: fairUsers,
      meta: {} as Record<string, { score: number; reason?: string }>,
      quotaExhausted: false,
    };
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

      // Enforce daily swipe quota for free users (same check as recommendations)
      const currentUserForQuota = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { membership: true },
      });
      const isFreeUser =
        !currentUserForQuota?.membership ||
        currentUserForQuota.membership === 'FREE';
      if (isFreeUser) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const swipeCount = await ctx.prisma.like.count({
          where: { fromUserId: userId, createdAt: { gte: todayStart } },
        });
        if (swipeCount >= FREE_DAILY_SWIPES) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '今日滑动次数已用完，明天再来吧',
          });
        }
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

        // Check for an existing conversation between these two users
        const existingConversation = await ctx.prisma.conversation.findFirst({
          where: {
            participants: {
              every: {
                userId: { in: [userId, input.toUserId] },
              },
            },
          },
          include: { participants: true },
        });
        const twoPartyConvo = existingConversation?.participants.length === 2;

        let conversation: { id: string };
        if (twoPartyConvo && existingConversation) {
          conversation = existingConversation;
        } else {
          // Create a conversation for the matched pair
          conversation = await ctx.prisma.conversation.create({
            data: {
              lastMessageAt: new Date(),
              participants: {
                create: [{ userId }, { userId: input.toUserId }],
              },
            },
          });
        }
        conversationId = conversation.id;

        // Notify the other user about the match
        const fromUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { nickname: true },
        });
        NotificationService.notifyMatch(
          input.toUserId,
          fromUser?.nickname ?? '某人',
          conversation.id,
        ).catch((err) => logger.error('push notification failed', { err }));
      }

      // Notify about the like if no match yet
      if (!isMatched) {
        const fromUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { nickname: true },
        });
        NotificationService.notifyNewLike(
          input.toUserId,
          fromUser?.nickname ?? '某人',
        ).catch((err) => logger.error('push notification failed', { err }));
      }

      return { like, isMatched, conversationId };
    }),

  /** Skip/pass a user — records interaction so they are excluded from recommendations */
  skip: protectedProcedure
    .input(skipSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Create a SKIP like record — skips are excluded from the exclusion query
      // so skipped users can reappear in future recommendations
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
          type: 'SKIP',
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
      take: 100,
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

  /**
   * Task 2: Daily picks — 5 high-quality users with day-level caching + dedup.
   * Accepts optional excludeIds to avoid overlap with main recommendation list.
   */
  dailyPicks: protectedProcedure
    .input(
      z
        .object({
          excludeIds: z.array(z.string()).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const today = todayKey();
      const cacheKey = `${userId}-${today}`;

      // Purge stale entries
      purgeDailyPicksCache();

      // Return cached result if available
      const cached = dailyPicksCache.get(cacheKey);
      if (cached) {
        return cached.users;
      }

      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true },
      });

      // Get existing interactions to exclude
      const existingLikes = await ctx.prisma.like.findMany({
        where: { fromUserId: userId },
        select: { toUserId: true },
      });
      const baseExcludeIds = [
        userId,
        ...existingLikes.map((l) => l.toUserId),
        ...(input?.excludeIds ?? []),
      ];

      // Find verified, active users of the opposite gender
      const candidates = await ctx.prisma.user.findMany({
        where: {
          id: { notIn: baseExcludeIds },
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
      const picks = shuffled.slice(0, 5);

      // Cache until end of day (midnight of next day)
      const tomorrow = new Date(today + 'T00:00:00');
      tomorrow.setDate(tomorrow.getDate() + 1);
      dailyPicksCache.set(cacheKey, {
        users: picks,
        expireAt: tomorrow.getTime(),
      });

      return picks;
    }),

  /**
   * Task 4: Get remaining swipe quota for today.
   */
  remainingSwipes: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { membership: true },
    });

    const isFreeUser =
      !currentUser?.membership || currentUser.membership === 'FREE';

    if (!isFreeUser) {
      return {
        remaining: Infinity,
        total: Infinity,
        quotaExhausted: false,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const swipeCount = await ctx.prisma.like.count({
      where: {
        fromUserId: userId,
        createdAt: { gte: todayStart },
      },
    });

    const remaining = Math.max(0, FREE_DAILY_SWIPES - swipeCount);

    return {
      used: swipeCount,
      remaining,
      total: FREE_DAILY_SWIPES,
      quotaExhausted: remaining === 0,
    };
  }),

  /**
   * Task 5: Record user feedback signal (view duration, etc.)
   */
  recordFeedback: protectedProcedure
    .input(feedbackSignalSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      await ctx.prisma.feedbackSignal.create({
        data: {
          userId,
          targetUserId: input.targetUserId,
          action: input.action,
          durationMs: input.durationMs,
        },
      });

      return { success: true };
    }),

  /** Get current user's credit balance */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    return CreditsService.getBalance(ctx.user.id);
  }),
});

// ── Task 3: Weighted random shuffle helper ──
// Users earlier in the list (more recently active) get higher weight,
// but are not guaranteed to stay at the top.
function weightedRandomShuffle<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;

  const weighted = items.map((item, index) => {
    // Weight decays with position: first item gets weight ~1.0, last gets ~0.2
    const weight = 0.2 + 0.8 * ((items.length - 1 - index) / (items.length - 1));
    return { item, sortKey: Math.random() * weight };
  });

  weighted.sort((a, b) => b.sortKey - a.sortKey);
  return weighted.slice(0, limit).map((w) => w.item);
}
