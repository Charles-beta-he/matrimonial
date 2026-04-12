import { describe, it, expect, beforeEach, vi } from 'vitest';

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
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const baseCredits = {
  userId: 'u1',
  superLikes: 5,
  loveLetters: 2,
  videoTickets: 0,
  boostUntil: null as Date | null,
};

describe('CreditsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getBalance returns existing credits', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits });
    const { CreditsService } = await import('./credits.service');
    const result = await CreditsService.getBalance('u1');
    expect(result.superLikes).toBe(5);
    expect(prisma.userCredits.create).not.toHaveBeenCalled();
  });

  it('getBalance creates credits if missing', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue(null);
    (prisma.userCredits.create as any).mockResolvedValue({ ...baseCredits, superLikes: 0 });
    const { CreditsService } = await import('./credits.service');
    const result = await CreditsService.getBalance('u1');
    expect(prisma.userCredits.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });
    expect(result.superLikes).toBe(0);
  });

  it('grant SUPER_LIKE increments by 5', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits });
    (prisma.userCredits.update as any).mockResolvedValue({});
    (prisma.creditTransaction.create as any).mockResolvedValue({});
    const { CreditsService } = await import('./credits.service');

    await CreditsService.grant('u1', 'SUPER_LIKE', 5, 'purchase', 'o1');

    expect(prisma.userCredits.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { superLikes: 10 },
    });
    expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 'u1', kind: 'SUPER_LIKE', amount: 5, reason: 'purchase', orderId: 'o1' },
    });
  });

  it('grant LOVE_LETTER increments loveLetters', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits });
    const { CreditsService } = await import('./credits.service');

    await CreditsService.grant('u1', 'LOVE_LETTER', 3, 'purchase');

    expect(prisma.userCredits.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { loveLetters: 5 },
    });
  });

  it('grant BOOST sets boostUntil to now + N minutes', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits });
    const { CreditsService } = await import('./credits.service');

    const before = Date.now();
    await CreditsService.grant('u1', 'BOOST', 30, 'purchase');
    const after = Date.now();

    const call = (prisma.userCredits.update as any).mock.calls[0][0];
    const boostUntil: Date = call.data.boostUntil;
    expect(boostUntil).toBeInstanceOf(Date);
    expect(boostUntil.getTime()).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
    expect(boostUntil.getTime()).toBeLessThanOrEqual(after + 30 * 60 * 1000);
  });

  it('grant BOOST extends existing active boostUntil', async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000);
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits, boostUntil: future });
    const { CreditsService } = await import('./credits.service');

    await CreditsService.grant('u1', 'BOOST', 30, 'purchase');

    const call = (prisma.userCredits.update as any).mock.calls[0][0];
    const boostUntil: Date = call.data.boostUntil;
    expect(boostUntil.getTime()).toBe(future.getTime() + 30 * 60 * 1000);
  });

  it('consume SUPER_LIKE decrements by 1', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits });
    const { CreditsService } = await import('./credits.service');

    await CreditsService.consume('u1', 'SUPER_LIKE', 1, 'used');

    expect(prisma.userCredits.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { superLikes: 4 },
    });
    expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 'u1', kind: 'SUPER_LIKE', amount: -1, reason: 'used' },
    });
  });

  it('consume throws when insufficient balance', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits, superLikes: 0 });
    const { CreditsService } = await import('./credits.service');

    await expect(CreditsService.consume('u1', 'SUPER_LIKE', 1, 'used')).rejects.toThrow();
    expect(prisma.userCredits.update).not.toHaveBeenCalled();
  });

  it('consume VIDEO_TICKET decrements videoTickets', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits, videoTickets: 3 });
    const { CreditsService } = await import('./credits.service');

    await CreditsService.consume('u1', 'VIDEO_TICKET', 1, 'used');

    expect(prisma.userCredits.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { videoTickets: 2 },
    });
  });

  it('isBoostActive returns true when boostUntil in future', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({
      ...baseCredits,
      boostUntil: new Date(Date.now() + 60_000),
    });
    const { CreditsService } = await import('./credits.service');
    expect(await CreditsService.isBoostActive('u1')).toBe(true);
  });

  it('isBoostActive returns false when boostUntil is null', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({ ...baseCredits, boostUntil: null });
    const { CreditsService } = await import('./credits.service');
    expect(await CreditsService.isBoostActive('u1')).toBe(false);
  });

  it('isBoostActive returns false when boostUntil in past', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.userCredits.findUnique as any).mockResolvedValue({
      ...baseCredits,
      boostUntil: new Date(Date.now() - 60_000),
    });
    const { CreditsService } = await import('./credits.service');
    expect(await CreditsService.isBoostActive('u1')).toBe(false);
  });
});
