import { feedbackSignalSchema, likeSchema, skipSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { requireMembership } from '../middlewares/requireMembership';
import { RecommendAdapter } from '../../adapters/recommend.adapter';
import { CreditsService } from '../../modules/credits/credits.service';
import { NotificationService } from '../../modules/notification/notification.module';
import { logger } from '../../lib/logger';
import { getRedis } from '../../lib/redis';
import { getIo } from '../../lib/ws';

/** SHA-256 hex digest of a string */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Returns true if either user has blocked the other via phone-hash lists */
async function isBlockedPair(
  prisma: { user: { findUnique(args: { where: { id: string }; select: { phone: true; blockedPhoneHashes: true } }): Promise<{ phone: string; blockedPhoneHashes: string[] } | null> } },
  viewerId: string,
  targetId: string,
): Promise<boolean> {
  const [viewer, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewerId }, select: { phone: true, blockedPhoneHashes: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { phone: true, blockedPhoneHashes: true } }),
  ]);
  if (!viewer || !target) return false;
  if (viewer.blockedPhoneHashes.includes(sha256Hex(target.phone))) return true;
  if (target.blockedPhoneHashes.includes(sha256Hex(viewer.phone))) return true;
  return false;
}

/** Get today's date string in YYYY-MM-DD */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds from now until next midnight */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// ── Free user daily swipe quota ──
const FREE_DAILY_SWIPES = 30;

// ── Daily picks: weighted scoring ────────────────────────────────────────────

export type ScoringCandidate = {
  id: string;
  birthday: Date;
  city: string;
  verificationLevel: string;
  bio: string | null;
  lastActiveAt: Date;
  photos: { id: string }[];
  tags: { tag: string }[];
  prompts: { id: string }[];
};

export type ViewerContext = {
  city: string;
  tags: { tag: string }[];
  preference: {
    ageMin: number | null;
    ageMax: number | null;
    acceptLongDistance: boolean;
  } | null;
};

/**
 * Score a candidate 0–100 based on six signals.
 * Higher score = better daily pick.
 * Exported for unit testing only.
 */
export function scoreDailyPick(
  candidate: ScoringCandidate,
  viewer: ViewerContext,
): number {
  let score = 0;

  // 1. Age proximity (max 20 pts)
  if (viewer.preference?.ageMin != null && viewer.preference?.ageMax != null) {
    const ageMid = (viewer.preference.ageMin + viewer.preference.ageMax) / 2;
    const nowMs = Date.now();
    const candidateAgeYears =
      (nowMs - candidate.birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const diff = Math.abs(candidateAgeYears - ageMid);
    // Within 1 year → 20, within 5 → 10, within 10 → 5, else 0
    if (diff <= 1) score += 20;
    else if (diff <= 5) score += 10;
    else if (diff <= 10) score += 5;
  }

  // 2. City match (max 15 pts)
  if (candidate.city === viewer.city) {
    score += 15;
  } else if (!viewer.preference?.acceptLongDistance) {
    score -= 5;
  }

  // 3. Verification level (max 15 pts)
  if (candidate.verificationLevel === 'L4') score += 15;
  else if (candidate.verificationLevel === 'L3') score += 10;
  else if (candidate.verificationLevel === 'L2') score += 5;

  // 4. Profile completeness (max 25 pts, 5 pts each component)
  if (candidate.photos.length >= 1) score += 5; // has avatar (first photo)
  if (candidate.photos.length >= 3) score += 5; // ≥3 photos
  if (candidate.bio && candidate.bio.trim().length > 0) score += 5;
  if (candidate.tags.length >= 3) score += 5;
  if (candidate.prompts.length >= 1) score += 5;

  // 5. Activity recency (max 10 pts)
  const msSinceActive = Date.now() - candidate.lastActiveAt.getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  if (msSinceActive <= msPerDay) score += 10;
  else if (msSinceActive <= 7 * msPerDay) score += 5;

  // 6. Mutual interests (max 15 pts, 3 pts per overlap, capped)
  const viewerTagSet = new Set(viewer.tags.map((t) => t.tag));
  const overlap = candidate.tags.filter((t) => viewerTagSet.has(t.tag)).length;
  score += Math.min(overlap * 3, 15);

  return score;
}

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

      // Bidirectional block check
      if (await isBlockedPair(ctx.prisma, userId, input.toUserId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '用户不可用' });
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

        // Fetch both users for notifications and Socket.io payloads
        const [fromUser, toUser] = await Promise.all([
          ctx.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              nickname: true,
              photos: {
                where: { auditStatus: 'APPROVED' },
                orderBy: { order: 'asc' },
                take: 1,
                select: { url: true },
              },
            },
          }),
          ctx.prisma.user.findUnique({
            where: { id: input.toUserId },
            select: {
              id: true,
              nickname: true,
              photos: {
                where: { auditStatus: 'APPROVED' },
                orderBy: { order: 'asc' },
                take: 1,
                select: { url: true },
              },
            },
          }),
        ]);

        // Push notification to the liked user
        NotificationService.notifyMatch(
          input.toUserId,
          fromUser?.nickname ?? '某人',
          conversation.id,
        ).catch((err) => logger.error('push notification failed', { err }));

        // Real-time Socket.io broadcast to both users
        const io = getIo();
        if (io) {
          const matchedAt = new Date().toISOString();

          // Notify liker (userId) — they see toUser's info
          io.to(`user:${userId}`).emit('match:success', {
            matchedUser: {
              id: toUser?.id ?? input.toUserId,
              nickname: toUser?.nickname ?? '',
              avatar: toUser?.photos[0]?.url ?? null,
            },
            conversationId: conversation.id,
            matchedAt,
          });

          // Notify liked user (toUserId) — they see fromUser's info
          io.to(`user:${input.toUserId}`).emit('match:success', {
            matchedUser: {
              id: fromUser?.id ?? userId,
              nickname: fromUser?.nickname ?? '',
              avatar: fromUser?.photos[0]?.url ?? null,
            },
            conversationId: conversation.id,
            matchedAt,
          });
        }
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

      // Bidirectional block check
      if (await isBlockedPair(ctx.prisma, userId, input.toUserId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '用户不可用' });
      }

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

  /** Get users who liked me but I haven't acted on — requires MONTHLY membership */
  likedMe: requireMembership('MONTHLY').query(async ({ ctx }) => {
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
   * Requires MONTHLY membership.
   */
  dailyPicks: requireMembership('MONTHLY')
    .input(
      z
        .object({
          excludeIds: z.array(z.string()).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const cacheKey = `daily_picks:${userId}:${todayKey()}`;
      const redis = getRedis();

      if (redis) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) return JSON.parse(cached);
        } catch {}
      }

      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          gender: true,
          city: true,
          tags: { select: { tag: true } },
          preferences: {
            select: {
              ageMin: true,
              ageMax: true,
              acceptLongDistance: true,
            },
          },
        },
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

      // Weighted ranking: score each candidate, pick top 5
      const viewerCtx: ViewerContext = {
        city: currentUser?.city ?? '',
        tags: currentUser?.tags ?? [],
        preference: currentUser?.preferences ?? null,
      };
      const picks = candidates
        .map((c) => ({ candidate: c, score: scoreDailyPick(c, viewerCtx) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((s) => s.candidate);

      if (redis) {
        try {
          await redis.setex(cacheKey, secondsUntilMidnight(), JSON.stringify(picks));
        } catch {}
      }

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
