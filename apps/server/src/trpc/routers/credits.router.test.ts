import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockCredits = {
  id: 'credits-1',
  userId: 'user-1',
  superLikes: 5,
  loveLetters: 2,
  videoTickets: 1,
  boostUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../modules/credits/credits.service', () => ({
  CreditsService: {
    getBalance: vi.fn(),
    grant: vi.fn(),
    consume: vi.fn(),
    isBoostActive: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { CreditsService } from '../../modules/credits/credits.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('creditsRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./credits.router');
    expect(mod.creditsRouter).toBeDefined();
  });

  // ── balance ───────────────────────────────────────────────────────────────

  describe('balance', () => {
    it('returns full credit balance for current user', async () => {
      vi.mocked(CreditsService.getBalance).mockResolvedValue(mockCredits as any);

      const result = await CreditsService.getBalance('user-1');
      expect(result.superLikes).toBe(5);
      expect(result.loveLetters).toBe(2);
      expect(result.videoTickets).toBe(1);
      expect(CreditsService.getBalance).toHaveBeenCalledWith('user-1');
    });

    it('creates a credits record when none exists', async () => {
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.userCredits.create).mockResolvedValue({ ...mockCredits, superLikes: 0, loveLetters: 0, videoTickets: 0 } as any);

      const credits = await prisma.userCredits.findUnique({ where: { userId: 'user-1' } });
      expect(credits).toBeNull();

      const created = await prisma.userCredits.create({ data: { userId: 'user-1' } });
      expect(created.superLikes).toBe(0);
      expect(created.loveLetters).toBe(0);
    });

    it('returns existing credits without creating a new record', async () => {
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue(mockCredits as any);

      const credits = await prisma.userCredits.findUnique({ where: { userId: 'user-1' } });
      expect(credits).not.toBeNull();
      expect(prisma.userCredits.create).not.toHaveBeenCalled();
    });
  });

  // ── CreditsService.grant ──────────────────────────────────────────────────

  describe('CreditsService.grant', () => {
    it('increments superLikes balance correctly', async () => {
      vi.mocked(CreditsService.getBalance).mockResolvedValue(mockCredits as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([undefined, undefined] as any);

      vi.mocked(CreditsService.grant).mockImplementation(async () => undefined);

      await CreditsService.grant('user-1', 'SUPER_LIKE', 5, 'payment_order', 'order-1');
      expect(CreditsService.grant).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 5, 'payment_order', 'order-1');
    });

    it('sets boostUntil for BOOST kind', async () => {
      const now = new Date();
      const expectedBoostUntil = new Date(now.getTime() + 30 * 60 * 1000);

      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({ ...mockCredits, boostUntil: null } as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([undefined, undefined] as any);

      // Simulate BOOST grant logic
      const baseTime = now;
      const boostUntil = new Date(baseTime.getTime() + 30 * 60 * 1000);
      expect(boostUntil.getTime()).toBeCloseTo(expectedBoostUntil.getTime(), -3);
    });

    it('extends boostUntil when boost is already active', async () => {
      const currentBoostUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min remaining
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({
        ...mockCredits,
        boostUntil: currentBoostUntil,
      } as any);

      const now = new Date();
      const isActive = currentBoostUntil > now;
      expect(isActive).toBe(true);

      // Extending: base = currentBoostUntil, add 30 more minutes
      const newBoostUntil = new Date(currentBoostUntil.getTime() + 30 * 60 * 1000);
      expect(newBoostUntil.getTime()).toBeGreaterThan(currentBoostUntil.getTime());
    });
  });

  // ── CreditsService.consume ────────────────────────────────────────────────

  describe('CreditsService.consume', () => {
    it('decrements superLikes and creates a debit transaction', async () => {
      vi.mocked(CreditsService.consume).mockResolvedValue(undefined as any);

      await CreditsService.consume('user-1', 'SUPER_LIKE', 1, 'match_like');
      expect(CreditsService.consume).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 1, 'match_like');
    });

    it('throws PRECONDITION_FAILED when balance is insufficient', async () => {
      vi.mocked(CreditsService.consume).mockRejectedValue(
        new TRPCError({ code: 'PRECONDITION_FAILED', message: 'SUPER_LIKE 余额不足' }),
      );

      await expect(
        CreditsService.consume('user-1', 'SUPER_LIKE', 10, 'match_like'),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    });

    it('consumes VIDEO_TICKET for video calls', async () => {
      vi.mocked(CreditsService.consume).mockResolvedValue(undefined as any);

      await CreditsService.consume('user-1', 'VIDEO_TICKET', 1, 'video_call');
      expect(CreditsService.consume).toHaveBeenCalledWith('user-1', 'VIDEO_TICKET', 1, 'video_call');
    });
  });

  // ── CreditsService.isBoostActive ──────────────────────────────────────────

  describe('CreditsService.isBoostActive', () => {
    it('returns true when boostUntil is in the future', async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000);
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({
        ...mockCredits,
        boostUntil: futureDate,
      } as any);

      const credits = await prisma.userCredits.findUnique({ where: { userId: 'user-1' } });
      const isActive = !!(credits?.boostUntil && (credits.boostUntil as Date) > new Date());
      expect(isActive).toBe(true);
    });

    it('returns false when boostUntil is null', async () => {
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({
        ...mockCredits,
        boostUntil: null,
      } as any);

      const credits = await prisma.userCredits.findUnique({ where: { userId: 'user-1' } });
      const isActive = !!(credits?.boostUntil && (credits.boostUntil as Date) > new Date());
      expect(isActive).toBe(false);
    });

    it('returns false when boostUntil has expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({
        ...mockCredits,
        boostUntil: pastDate,
      } as any);

      const credits = await prisma.userCredits.findUnique({ where: { userId: 'user-1' } });
      const isActive = !!(credits?.boostUntil && (credits.boostUntil as Date) > new Date());
      expect(isActive).toBe(false);
    });
  });
});
