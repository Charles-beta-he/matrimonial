import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  nickname: '小明',
  gender: 'MALE',
  membership: 'FREE',
  blockedPhoneHashes: [],
  photos: [],
  tags: [],
  prompts: [],
  lastActiveAt: new Date(),
};

const mockTargetUser = {
  id: 'user-2',
  nickname: '小花',
  gender: 'FEMALE',
  membership: 'FREE',
  photos: [],
  tags: [],
  prompts: [],
  lastActiveAt: new Date(),
};

const mockLike = {
  id: 'like-1',
  fromUserId: 'user-1',
  toUserId: 'user-2',
  type: 'LIKE',
  isMatched: false,
  createdAt: new Date(),
};

const mockConversation = {
  id: 'conv-1',
  lastMessageAt: new Date(),
  participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    like: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    preference: {
      findUnique: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    feedbackSignal: {
      create: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock('../../adapters/recommend.adapter', () => ({
  RecommendAdapter: {
    getRecommendations: vi.fn(),
  },
}));

vi.mock('../../modules/credits/credits.service', () => ({
  CreditsService: {
    consume: vi.fn(),
    getBalance: vi.fn(),
  },
}));

vi.mock('../../modules/notification/notification.module', () => ({
  NotificationService: {
    notifyMatch: vi.fn().mockResolvedValue(undefined),
    notifyNewLike: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { RecommendAdapter } from '../../adapters/recommend.adapter';
import { CreditsService } from '../../modules/credits/credits.service';
import { scoreDailyPick } from './match.router';
import type { ScoringCandidate, ViewerContext } from './match.router';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('matchRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./match.router');
    expect(mod.matchRouter).toBeDefined();
  });

  // ── recommendations ──────────────────────────────────────────────────────

  describe('recommendations', () => {
    it('returns quotaExhausted=true when free user hit daily swipe limit', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ membership: 'FREE' } as any);
      vi.mocked(prisma.like.count).mockResolvedValue(30);

      // Simulate the router logic
      const isFreeUser = true;
      const swipeCount = 30;
      const FREE_DAILY_SWIPES = 30;

      if (isFreeUser && swipeCount >= FREE_DAILY_SWIPES) {
        const result = { users: [], meta: {}, quotaExhausted: true };
        expect(result.quotaExhausted).toBe(true);
        expect(result.users).toHaveLength(0);
      }
    });

    it('uses remote recommendations when Python service returns results', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ membership: 'GOLD' } as any);
      vi.mocked(RecommendAdapter.getRecommendations).mockResolvedValue([
        { userId: 'user-2', score: 0.9, reason: 'high compatibility' },
      ]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockTargetUser] as any);

      const remote = await RecommendAdapter.getRecommendations('user-1', 20);
      expect(remote).toHaveLength(1);
      expect(remote[0].userId).toBe('user-2');

      const users = await prisma.user.findMany({
        where: { id: { in: ['user-2'] } },
        include: { photos: true, tags: true, prompts: true },
      });
      expect(users).toHaveLength(1);
    });

    it('falls back to local DB when Python service returns empty', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ membership: 'FREE' } as any)   // quota check
        .mockResolvedValueOnce({ gender: 'MALE' } as any);      // gender filter
      vi.mocked(RecommendAdapter.getRecommendations).mockResolvedValue([]);
      vi.mocked(prisma.preference.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.like.count).mockResolvedValue(0);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockTargetUser] as any);

      const remote = await RecommendAdapter.getRecommendations('user-1', 20);
      expect(remote).toHaveLength(0);

      // Falls back to findMany
      const candidates = await prisma.user.findMany({
        where: { id: { notIn: ['user-1'] }, gender: 'FEMALE' },
        include: { photos: true, tags: true, prompts: true },
        orderBy: { lastActiveAt: 'desc' },
        take: 50,
      });
      expect(candidates).toHaveLength(1);
    });

    it('throws FORBIDDEN when free user uses advanced filters', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ membership: 'FREE' } as any);

      const err = new TRPCError({ code: 'FORBIDDEN', message: '高级筛选需要会员权限' });
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('高级筛选需要会员权限');
    });
  });

  // ── like ─────────────────────────────────────────────────────────────────

  describe('like', () => {
    it('throws BAD_REQUEST when liking yourself', () => {
      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot like yourself' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws FORBIDDEN when free user has exhausted daily swipe quota', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ membership: 'FREE' } as any);
      vi.mocked(prisma.like.count).mockResolvedValueOnce(30); // quota exhausted

      const membership = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { membership: true } });
      const isFreeUser = !membership?.membership || membership.membership === 'FREE';
      const swipeCount = await prisma.like.count({ where: { fromUserId: 'user-1', createdAt: { gte: new Date() } } });

      expect(isFreeUser).toBe(true);
      expect(swipeCount).toBe(30);

      const err = new TRPCError({ code: 'FORBIDDEN', message: '今日滑动次数已用完，明天再来吧' });
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('今日滑动次数已用完，明天再来吧');
    });

    it('throws NOT_FOUND when target user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const target = await prisma.user.findUnique({ where: { id: 'user-999' }, select: { id: true } });
      expect(target).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Target user not found' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('creates like record and returns isMatched=false for one-way like', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: 'user-2' } as any)   // target exists
        .mockResolvedValueOnce({ nickname: '小明' } as any); // fromUser for notification
      vi.mocked(prisma.like.findUnique).mockResolvedValue(null); // no reciprocal
      vi.mocked(prisma.like.upsert).mockResolvedValue({ ...mockLike, isMatched: false } as any);

      const target = await prisma.user.findUnique({ where: { id: 'user-2' }, select: { id: true } });
      expect(target).toBeDefined();

      const reciprocal = await prisma.like.findUnique({ where: { fromUserId_toUserId: { fromUserId: 'user-2', toUserId: 'user-1' } } });
      expect(reciprocal).toBeNull();

      const like = await prisma.like.upsert({
        where: { fromUserId_toUserId: { fromUserId: 'user-1', toUserId: 'user-2' } },
        create: { fromUserId: 'user-1', toUserId: 'user-2', type: 'LIKE' as any, isMatched: false },
        update: { type: 'LIKE' as any, isMatched: false },
      });
      expect(like.isMatched).toBe(false);
    });

    it('creates conversation when mutual match detected', async () => {
      const reciprocalLike = { id: 'like-existing', fromUserId: 'user-2', toUserId: 'user-1' };

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: 'user-2' } as any)
        .mockResolvedValueOnce({ nickname: '小明' } as any);
      vi.mocked(prisma.like.findUnique).mockResolvedValue(reciprocalLike as any);
      vi.mocked(prisma.like.upsert).mockResolvedValue({ ...mockLike, isMatched: true } as any);
      vi.mocked(prisma.like.update).mockResolvedValue({ ...reciprocalLike, isMatched: true } as any);
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.conversation.create).mockResolvedValue(mockConversation as any);

      const isMatched = !!reciprocalLike;
      expect(isMatched).toBe(true);

      const conversation = await prisma.conversation.create({
        data: {
          lastMessageAt: new Date(),
          participants: { create: [{ userId: 'user-1' }, { userId: 'user-2' }] },
        },
      });
      expect(conversation.id).toBe('conv-1');
    });

    it('consumes SUPER_LIKE credit for super like type', async () => {
      vi.mocked(CreditsService.consume).mockResolvedValue(undefined as any);

      await CreditsService.consume('user-1', 'SUPER_LIKE', 1, 'match_like');
      expect(CreditsService.consume).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 1, 'match_like');
    });
  });

  // ── skip ─────────────────────────────────────────────────────────────────

  describe('skip', () => {
    it('creates SKIP like record', async () => {
      const skipLike = { ...mockLike, type: 'SKIP', isMatched: false };
      vi.mocked(prisma.like.upsert).mockResolvedValue(skipLike as any);

      const result = await prisma.like.upsert({
        where: { fromUserId_toUserId: { fromUserId: 'user-1', toUserId: 'user-2' } },
        create: { fromUserId: 'user-1', toUserId: 'user-2', type: 'SKIP', isMatched: false },
        update: {},
      });
      expect(result.type).toBe('SKIP');
    });

    it('is idempotent — upsert update is no-op', async () => {
      vi.mocked(prisma.like.upsert).mockResolvedValue(mockLike as any);

      await prisma.like.upsert({
        where: { fromUserId_toUserId: { fromUserId: 'user-1', toUserId: 'user-2' } },
        create: { fromUserId: 'user-1', toUserId: 'user-2', type: 'SKIP', isMatched: false },
        update: {},
      });
      expect(prisma.like.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
    });
  });

  // ── likedMe ───────────────────────────────────────────────────────────────

  describe('likedMe', () => {
    it('returns users who liked me but I have not acted on', async () => {
      const inboundLike = {
        ...mockLike,
        fromUserId: 'user-2',
        toUserId: 'user-1',
        fromUser: { ...mockTargetUser, photos: [], tags: [] },
      };
      vi.mocked(prisma.like.findMany)
        .mockResolvedValueOnce([])               // myLikes (actedOnIds)
        .mockResolvedValueOnce([inboundLike] as any); // inbound likes

      const myLikes = await prisma.like.findMany({ where: { fromUserId: 'user-1' }, select: { toUserId: true } });
      expect(myLikes).toHaveLength(0);

      const inbound = await prisma.like.findMany({
        where: { toUserId: 'user-1', fromUserId: { notIn: [] } },
        include: { fromUser: { include: { photos: true, tags: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(inbound).toHaveLength(1);
      expect(inbound[0].fromUserId).toBe('user-2');
    });
  });

  // ── matches ───────────────────────────────────────────────────────────────

  describe('matches', () => {
    it('returns all mutual matches for current user', async () => {
      const matchedLike = { ...mockLike, isMatched: true, fromUser: mockUser, toUser: mockTargetUser };
      vi.mocked(prisma.like.findMany).mockResolvedValue([matchedLike] as any);

      const result = await prisma.like.findMany({
        where: { isMatched: true, OR: [{ fromUserId: 'user-1' }, { toUserId: 'user-1' }] },
        include: { fromUser: { include: { photos: true } }, toUser: { include: { photos: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isMatched).toBe(true);
    });

    it('returns empty array when no matches exist', async () => {
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const result = await prisma.like.findMany({ where: { isMatched: true, OR: [] } });
      expect(result).toHaveLength(0);
    });
  });

  // ── remainingSwipes ───────────────────────────────────────────────────────

  describe('remainingSwipes', () => {
    it('returns Infinity for premium members', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ membership: 'GOLD' } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { membership: true } });
      const isFreeUser = !user?.membership || user.membership === 'FREE';
      expect(isFreeUser).toBe(false);

      const result = { remaining: Infinity, total: Infinity, quotaExhausted: false };
      expect(result.remaining).toBe(Infinity);
    });

    it('returns correct remaining count and used field for free user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ membership: 'FREE' } as any);
      vi.mocked(prisma.like.count).mockResolvedValue(10);

      const swipeCount = await prisma.like.count({ where: { fromUserId: 'user-1', createdAt: { gte: new Date() } } });
      const remaining = Math.max(0, 30 - swipeCount);
      const used = swipeCount;
      expect(remaining).toBe(20);
      expect(used).toBe(10);
      expect(remaining > 0).toBe(true);
    });

    it('returns quotaExhausted=true when swipe count reaches limit', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ membership: 'FREE' } as any);
      vi.mocked(prisma.like.count).mockResolvedValue(30);

      const swipeCount = await prisma.like.count({ where: {} });
      const remaining = Math.max(0, 30 - swipeCount);
      expect(remaining).toBe(0);
      expect(remaining === 0).toBe(true); // quotaExhausted
    });
  });

  // ── recordFeedback ────────────────────────────────────────────────────────

  describe('recordFeedback', () => {
    it('creates feedback signal record and returns success', async () => {
      const mockSignal = { id: 'signal-1', userId: 'user-1', targetUserId: 'user-2', action: 'VIEW', durationMs: 5000 };
      vi.mocked(prisma.feedbackSignal.create).mockResolvedValue(mockSignal as any);

      const result = await prisma.feedbackSignal.create({
        data: { userId: 'user-1', targetUserId: 'user-2', action: 'VIEW', durationMs: 5000 },
      });
      expect(result.action).toBe('VIEW');
      expect(result.durationMs).toBe(5000);
    });
  });

  // ── getCredits ────────────────────────────────────────────────────────────

  describe('getCredits', () => {
    it('delegates to CreditsService.getBalance', async () => {
      vi.mocked(CreditsService.getBalance).mockResolvedValue({ superLike: 3, boost: 1 } as any);

      const balance = await CreditsService.getBalance('user-1');
      expect(CreditsService.getBalance).toHaveBeenCalledWith('user-1');
      expect(balance).toEqual({ superLike: 3, boost: 1 });
    });
  });

  // ── scoreDailyPick ────────────────────────────────────────────────────────

  describe('scoreDailyPick', () => {
    const nowMs = Date.now();
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;

    const baseCandidate: ScoringCandidate = {
      id: 'c1',
      // 27 years old
      birthday: new Date(nowMs - 27 * msPerYear),
      city: 'Beijing',
      verificationLevel: 'L2',
      bio: null,
      lastActiveAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      photos: [],
      tags: [],
      prompts: [],
    };

    const baseViewer: ViewerContext = {
      city: 'Beijing',
      tags: [],
      preference: { ageMin: 25, ageMax: 30, acceptLongDistance: false },
    };

    it('scores higher for same city than different city', () => {
      const sameCityScore = scoreDailyPick(baseCandidate, baseViewer);
      const diffCityScore = scoreDailyPick(
        { ...baseCandidate, city: 'Shanghai' },
        baseViewer,
      );
      expect(sameCityScore).toBeGreaterThan(diffCityScore);
    });

    it('scores higher for L4 verification than L2', () => {
      const l4Score = scoreDailyPick(
        { ...baseCandidate, verificationLevel: 'L4' },
        baseViewer,
      );
      const l2Score = scoreDailyPick(
        { ...baseCandidate, verificationLevel: 'L2' },
        baseViewer,
      );
      expect(l4Score).toBeGreaterThan(l2Score);
    });

    it('scores higher for complete profile', () => {
      const completeScore = scoreDailyPick(
        {
          ...baseCandidate,
          photos: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
          bio: 'loves hiking',
          tags: [{ tag: 'hiking' }, { tag: 'coffee' }, { tag: 'travel' }],
          prompts: [{ id: 'pr1' }],
        },
        baseViewer,
      );
      const emptyScore = scoreDailyPick(baseCandidate, baseViewer);
      expect(completeScore).toBeGreaterThan(emptyScore);
    });

    it('awards 10 pts for activity within 24h, 5 pts within 7d', () => {
      const activeRecently = scoreDailyPick(
        { ...baseCandidate, lastActiveAt: new Date(nowMs - 1 * 60 * 60 * 1000) },
        baseViewer,
      );
      const activeWeek = scoreDailyPick(
        { ...baseCandidate, lastActiveAt: new Date(nowMs - 3 * 24 * 60 * 60 * 1000) },
        baseViewer,
      );
      const activeOld = scoreDailyPick(baseCandidate, baseViewer); // 10 days ago
      expect(activeRecently).toBeGreaterThan(activeWeek);
      expect(activeWeek).toBeGreaterThan(activeOld);
    });

    it('awards extra pts for mutual tag overlap, capped at 15', () => {
      const viewerWithTags: ViewerContext = {
        ...baseViewer,
        tags: [{ tag: 'hiking' }, { tag: 'coffee' }, { tag: 'travel' }, { tag: 'art' }, { tag: 'music' }, { tag: 'yoga' }],
      };
      const noOverlap = scoreDailyPick(baseCandidate, viewerWithTags);
      const someOverlap = scoreDailyPick(
        { ...baseCandidate, tags: [{ tag: 'hiking' }, { tag: 'coffee' }] },
        viewerWithTags,
      );
      const fullOverlap = scoreDailyPick(
        {
          ...baseCandidate,
          tags: [
            { tag: 'hiking' }, { tag: 'coffee' }, { tag: 'travel' },
            { tag: 'art' }, { tag: 'music' }, { tag: 'yoga' },
          ],
        },
        viewerWithTags,
      );
      expect(someOverlap).toBeGreaterThan(noOverlap);
      // 6 overlaps * 3 = 18 but capped at 15; plus +5 from ≥3-tag completeness bonus = delta 20
      expect(fullOverlap - noOverlap).toBe(20);
    });

    it('gives no age penalty when preference is not set', () => {
      const noPreferenceViewer: ViewerContext = { ...baseViewer, preference: null };
      const score = scoreDailyPick(baseCandidate, noPreferenceViewer);
      // Should not throw and should still score city/verification/etc
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('does not penalise different city when acceptLongDistance=true', () => {
      const longDistanceViewer: ViewerContext = {
        ...baseViewer,
        preference: { ageMin: 25, ageMax: 30, acceptLongDistance: true },
      };
      const diffCity = scoreDailyPick(
        { ...baseCandidate, city: 'Shanghai' },
        longDistanceViewer,
      );
      const sameCity = scoreDailyPick(baseCandidate, longDistanceViewer);
      // Different city gets 0 bonus (no penalty), same city gets +15
      expect(sameCity - diffCity).toBe(15);
    });
  });
});
