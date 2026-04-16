import { describe, it, expect, vi, beforeEach } from 'vitest';


// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    checkIn: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    like: { count: vi.fn() },
    activitySignup: { count: vi.fn() },
    message: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    circleMember: { count: vi.fn() },
    videoRoom: { count: vi.fn() },
  },
}));

vi.mock('../../modules/credits/credits.service', () => ({
  CreditsService: {
    grant: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { CreditsService } from '../../modules/credits/credits.service';
import { initTRPC } from '@trpc/server';

// ── Context Helper ─────────────────────────────────────────────────────────────

function makeCtx(userId = 'user-1') {
  return {
    prisma,
    user: { id: userId, role: 'USER' as const },
    req: {} as any,
  };
}

async function makeCaller(userId = 'user-1') {
  const { checkinRouter } = await import('./checkin.router');
  const t = initTRPC.context<ReturnType<typeof makeCtx>>().create();
  const app = t.router({ checkin: checkinRouter });
  return app.createCaller(makeCtx(userId));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkinRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(CreditsService.grant).mockResolvedValue(undefined as any);
    // Default stubs for checkAndGrantAchievements to prevent unhandled rejections
    vi.mocked(prisma.like.count).mockResolvedValue(0);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(0);
    vi.mocked(prisma.activitySignup.count).mockResolvedValue(0);
    vi.mocked(prisma.message.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      verificationLevel: 'L1',
      photos: [],
      tags: [],
      prompts: [],
    } as any);
    vi.mocked(prisma.achievement.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.circleMember.count).mockResolvedValue(0);
    vi.mocked((prisma as any).videoRoom.count).mockResolvedValue(0);
    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
  });

  it('should be importable', async () => {
    const mod = await import('./checkin.router');
    expect(mod.checkinRouter).toBeDefined();
  });

  // ── checkIn ───────────────────────────────────────────────────────────────

  describe('checkIn mutation', () => {
    it('creates check-in record with streak=1 on first check-in', async () => {
      vi.mocked(prisma.checkIn.findUnique)
        .mockResolvedValueOnce(null)   // today: not yet checked in
        .mockResolvedValueOnce(null);  // yesterday: no prior check-in
      vi.mocked(prisma.checkIn.create).mockResolvedValue({
        id: 'ci-1',
        userId: 'user-1',
        date: '2026-04-16',
        streak: 1,
        reward: '签到成功，获得1个超级喜欢',
      } as any);

      const caller = await makeCaller();
      const result = await caller.checkin.checkIn();

      expect(result.streak).toBe(1);
      expect(result.reward).toContain('1个超级喜欢');
      expect(CreditsService.grant).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 1, 'checkin_daily');
    });

    it('carries streak from yesterday when consecutive', async () => {
      const yesterdayRecord = { streak: 2 };
      vi.mocked(prisma.checkIn.findUnique)
        .mockResolvedValueOnce(null)                         // today: not checked in
        .mockResolvedValueOnce(yesterdayRecord as any);      // yesterday: streak=2
      vi.mocked(prisma.checkIn.create).mockResolvedValue({
        streak: 3,
        reward: '连续签到3天，获得2个超级喜欢',
      } as any);

      const caller = await makeCaller();
      const result = await caller.checkin.checkIn();

      expect(result.streak).toBe(3);
      expect(CreditsService.grant).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 2, 'checkin_3day');
    });

    it('grants 3 super likes for 7-day streak', async () => {
      const yesterdayRecord = { streak: 6 };
      vi.mocked(prisma.checkIn.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(yesterdayRecord as any);
      vi.mocked(prisma.checkIn.create).mockResolvedValue({
        streak: 7,
        reward: '连续签到7天，获得3个超级喜欢',
      } as any);

      const caller = await makeCaller();
      const result = await caller.checkin.checkIn();

      expect(result.streak).toBe(7);
      expect(CreditsService.grant).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 3, 'checkin_7day');
    });

    it('throws CONFLICT when user already checked in today', async () => {
      vi.mocked(prisma.checkIn.findUnique).mockResolvedValueOnce({ id: 'ci-existing' } as any);

      const caller = await makeCaller();
      await expect(caller.checkin.checkIn()).rejects.toThrow(
        expect.objectContaining({ code: 'CONFLICT' }),
      );
    });

    it('does not call CreditsService.grant when CONFLICT thrown', async () => {
      vi.mocked(prisma.checkIn.findUnique).mockResolvedValueOnce({ id: 'ci-existing' } as any);

      const caller = await makeCaller();
      await expect(caller.checkin.checkIn()).rejects.toThrow();
      expect(CreditsService.grant).not.toHaveBeenCalled();
    });
  });

  // ── history ───────────────────────────────────────────────────────────────

  describe('history query', () => {
    it('returns checkedInToday=false when no check-in today', async () => {
      vi.mocked(prisma.checkIn.findMany).mockResolvedValue([]);

      const caller = await makeCaller();
      const result = await caller.checkin.history();

      expect(result.checkedInToday).toBe(false);
      expect(result.totalCheckIns).toBe(0);
      expect(result.history).toHaveLength(0);
    });

    it('returns checkedInToday=true and currentStreak when today record exists', async () => {
      // Use UTC+8 date to match router logic
      const todayCST = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const mockCheckins = [{ date: todayCST, streak: 4 }];

      vi.mocked(prisma.checkIn.findMany).mockResolvedValue(mockCheckins as any);

      const caller = await makeCaller();
      const result = await caller.checkin.history();

      expect(result.checkedInToday).toBe(true);
      expect(result.currentStreak).toBe(4);
      expect(result.totalCheckIns).toBe(1);
    });

    it('returns all records from last 30 days', async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        date: `2026-04-${String(i + 1).padStart(2, '0')}`,
        streak: i + 1,
      }));
      vi.mocked(prisma.checkIn.findMany).mockResolvedValue(records as any);

      const caller = await makeCaller();
      const result = await caller.checkin.history();

      expect(result.totalCheckIns).toBe(10);
      expect(result.history).toHaveLength(10);
    });
  });

  // ── achievements ──────────────────────────────────────────────────────────

  describe('achievements query', () => {
    it('returns all achievement defs with unlocked=false when none earned', async () => {
      vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);

      const caller = await makeCaller();
      const result = await caller.checkin.achievements();

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((a) => a.unlocked === false)).toBe(true);
      expect(result.every((a) => a.unlockedAt === null)).toBe(true);
    });

    it('marks earned achievements as unlocked with timestamp', async () => {
      const unlockedAt = new Date('2026-01-01');
      vi.mocked(prisma.achievement.findMany).mockResolvedValue([
        { type: 'first_match', unlockedAt },
      ] as any);

      const caller = await makeCaller();
      const result = await caller.checkin.achievements();

      const firstMatch = result.find((a) => a.type === 'first_match');
      expect(firstMatch?.unlocked).toBe(true);
      expect(firstMatch?.unlockedAt).toEqual(unlockedAt);

      // Others remain locked
      const others = result.filter((a) => a.type !== 'first_match');
      expect(others.every((a) => a.unlocked === false)).toBe(true);
    });

    it('returns achievement definitions with expected fields', async () => {
      vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);

      const caller = await makeCaller();
      const result = await caller.checkin.achievements();

      for (const a of result) {
        expect(a).toHaveProperty('type');
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('description');
        expect(a).toHaveProperty('icon');
        expect(a).toHaveProperty('unlocked');
        expect(a).toHaveProperty('unlockedAt');
      }
    });
  });
});
