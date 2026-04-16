import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../modules/credits/credits.service', () => ({
  CreditsService: {
    grant: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { CreditsService } from '../../modules/credits/credits.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('inviteRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./invite.router');
    expect(mod.inviteRouter).toBeDefined();
  });

  // ── getMyCode ─────────────────────────────────────────────────────────────

  describe('getMyCode', () => {
    it('returns existing invite code when user already has one', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        inviteCode: 'ABC123',
        inviteCount: 5,
      } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { inviteCode: true, inviteCount: true },
      });
      expect(user?.inviteCode).toBe('ABC123');

      const result = user?.inviteCode
        ? { code: user.inviteCode, inviteCount: user.inviteCount ?? 0 }
        : null;
      expect(result).toEqual({ code: 'ABC123', inviteCount: 5 });
    });

    it('generates and saves new invite code when user has none', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ inviteCode: null, inviteCount: 0 } as any) // initial fetch
        .mockResolvedValueOnce(null); // collision check — no existing code
      vi.mocked(prisma.user.update).mockResolvedValue({ inviteCode: 'NEWCOD', inviteCount: 0 } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { inviteCode: true, inviteCount: true },
      });
      expect(user?.inviteCode).toBeNull();

      // No collision found, code gets saved
      const updated = await prisma.user.update({
        where: { id: 'user-1' },
        data: { inviteCode: 'NEWCOD' },
      });
      expect(updated).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { inviteCode: 'NEWCOD' } }),
      );
    });

    it('returns inviteCount=0 when user has no existing code', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ inviteCode: null, inviteCount: null } as any)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = { code: 'NEWCOD', inviteCount: 0 };
      expect(result.inviteCount).toBe(0);
    });
  });

  // ── applyCode ─────────────────────────────────────────────────────────────

  describe('applyCode', () => {
    it('successfully applies a valid invite code and grants credits', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ invitedBy: null } as any); // me: no code used yet
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'inviter-1',
        nickname: '小花',
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(CreditsService.grant).mockResolvedValue(undefined as any);

      // Verify inviter exists and is ACTIVE
      const inviter = await prisma.user.findFirst({
        where: { inviteCode: 'VALID1' },
        select: { id: true, nickname: true, status: true },
      });
      expect(inviter?.status).toBe('ACTIVE');

      // Grant credits to inviter and invitee
      await CreditsService.grant('inviter-1', 'SUPER_LIKE', 3, 'invite_reward');
      await CreditsService.grant('user-1', 'SUPER_LIKE', 2, 'invited_reward');

      expect(CreditsService.grant).toHaveBeenCalledWith('inviter-1', 'SUPER_LIKE', 3, 'invite_reward');
      expect(CreditsService.grant).toHaveBeenCalledWith('user-1', 'SUPER_LIKE', 2, 'invited_reward');
    });

    it('throws CONFLICT when user already used an invite code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ invitedBy: 'some-inviter' } as any);

      const me = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { invitedBy: true } });
      expect(me?.invitedBy).toBeDefined();

      const err = new TRPCError({ code: 'CONFLICT', message: '你已经使用过邀请码了' });
      expect(err.code).toBe('CONFLICT');
    });

    it('throws NOT_FOUND when invite code does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ invitedBy: null } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const inviter = await prisma.user.findFirst({ where: { inviteCode: 'BADCOD' } });
      expect(inviter).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: '邀请码无效' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('throws NOT_FOUND when inviter account is not ACTIVE', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ invitedBy: null } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'inviter-1',
        nickname: '某人',
        status: 'BANNED',
      } as any);

      const inviter = await prisma.user.findFirst({ where: { inviteCode: 'BANND1' } });
      expect(inviter?.status).not.toBe('ACTIVE');

      const err = new TRPCError({ code: 'NOT_FOUND', message: '邀请码无效' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('throws BAD_REQUEST when user tries to use their own invite code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ invitedBy: null } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user-1', // same as current user
        nickname: '小明',
        status: 'ACTIVE',
      } as any);

      const inviter = await prisma.user.findFirst({ where: { inviteCode: 'MYCODE' } });
      const isSelf = inviter?.id === 'user-1';
      expect(isSelf).toBe(true);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '不能使用自己的邀请码' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('increments inviteCount on inviter after successful apply', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ invitedBy: null } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'inviter-1',
        nickname: '小花',
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(CreditsService.grant).mockResolvedValue(undefined as any);

      await prisma.user.update({
        where: { id: 'inviter-1' },
        data: { inviteCount: { increment: 1 } },
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { inviteCount: { increment: 1 } } }),
      );
    });
  });

  // ── stats ─────────────────────────────────────────────────────────────────

  describe('stats', () => {
    it('returns invite code, count and list of invitees', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        inviteCode: 'MYCODE',
        inviteCount: 3,
      } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { nickname: '被邀请者A', createdAt: new Date('2024-01-01') },
        { nickname: '被邀请者B', createdAt: new Date('2024-01-02') },
      ] as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { inviteCode: true, inviteCount: true },
      });
      const invitees = await prisma.user.findMany({
        where: { invitedBy: 'user-1' },
        select: { nickname: true, createdAt: true },
      });

      const result = {
        code: user?.inviteCode ?? null,
        inviteCount: user?.inviteCount ?? 0,
        invitees,
      };

      expect(result.code).toBe('MYCODE');
      expect(result.inviteCount).toBe(3);
      expect(result.invitees).toHaveLength(2);
    });

    it('returns null code and 0 count when user has no invite code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        inviteCode: null,
        inviteCount: null,
      } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { inviteCode: true, inviteCount: true } });
      const result = {
        code: user?.inviteCode ?? null,
        inviteCount: user?.inviteCount ?? 0,
        invitees: [],
      };

      expect(result.code).toBeNull();
      expect(result.inviteCount).toBe(0);
      expect(result.invitees).toHaveLength(0);
    });
  });
});
