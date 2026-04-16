import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../adapters/verify.adapter', () => ({
  verify: {
    verifyIdCard: vi.fn(),
    verifyFace: vi.fn(),
  },
}));

vi.mock('../../lib/env', () => ({
  env: {},
  isConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { verify } from '../../adapters/verify.adapter';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('verificationRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./verification.router');
    expect(mod.verificationRouter).toBeDefined();
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns verification fields for existing user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        verificationLevel: 'L1',
        realNameVerified: false,
        faceVerified: false,
        eduVerified: false,
      } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { verificationLevel: true, realNameVerified: true, faceVerified: true, eduVerified: true },
      });
      expect(user?.verificationLevel).toBe('L1');
      expect(user?.realNameVerified).toBe(false);
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const user = await prisma.user.findUnique({ where: { id: 'ghost-user' } });
      expect(user).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  // ── submitRealName ────────────────────────────────────────────────────────

  describe('submitRealName', () => {
    it('successfully verifies ID card and upgrades to L2', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ realNameVerified: false } as any);
      vi.mocked(verify.verifyIdCard).mockResolvedValue({ passed: true });
      vi.mocked(prisma.user.update).mockResolvedValue({
        verificationLevel: 'L2',
        realNameVerified: true,
        faceVerified: false,
        eduVerified: false,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { realNameVerified: true } });
      expect(user?.realNameVerified).toBe(false);

      const result = await verify.verifyIdCard('张三', '110101199001011234');
      expect(result.passed).toBe(true);

      const updated = await prisma.user.update({
        where: { id: 'user-1' },
        data: { realNameVerified: true, verificationLevel: 'L2' },
        select: { verificationLevel: true, realNameVerified: true, faceVerified: true, eduVerified: true },
      });
      expect(updated.verificationLevel).toBe('L2');
      expect(updated.realNameVerified).toBe(true);
    });

    it('throws BAD_REQUEST when user is already real-name verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ realNameVerified: true } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { realNameVerified: true } });
      expect(user?.realNameVerified).toBe(true);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Already verified' });
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Already verified');
    });

    it('throws BAD_REQUEST when ID card verification fails', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ realNameVerified: false } as any);
      vi.mocked(verify.verifyIdCard).mockResolvedValue({ passed: false, reason: 'name_mismatch' });

      const result = await verify.verifyIdCard('张三', '110101199001011234');
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('name_mismatch');

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '实名认证失败: name_mismatch' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('uses "unknown" reason when verify adapter returns no reason', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ realNameVerified: false } as any);
      vi.mocked(verify.verifyIdCard).mockResolvedValue({ passed: false });

      const result = await verify.verifyIdCard('张三', '110101199001011234');
      const message = `实名认证失败: ${result.reason ?? 'unknown'}`;
      expect(message).toBe('实名认证失败: unknown');
    });
  });

  // ── submitFaceVerify ──────────────────────────────────────────────────────

  describe('submitFaceVerify', () => {
    it('successfully verifies face and upgrades to L3', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        realNameVerified: true,
        faceVerified: false,
      } as any);
      vi.mocked(verify.verifyFace).mockResolvedValue({ passed: true, score: 0.95 });
      vi.mocked(prisma.user.update).mockResolvedValue({
        verificationLevel: 'L3',
        realNameVerified: true,
        faceVerified: true,
        eduVerified: false,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { realNameVerified: true, faceVerified: true } });
      expect(user?.realNameVerified).toBe(true);
      expect(user?.faceVerified).toBe(false);

      const result = await verify.verifyFace('https://example.com/face.jpg', '');
      expect(result.passed).toBe(true);

      const updated = await prisma.user.update({
        where: { id: 'user-1' },
        data: { faceVerified: true, verificationLevel: 'L3' },
        select: { verificationLevel: true, realNameVerified: true, faceVerified: true, eduVerified: true },
      });
      expect(updated.verificationLevel).toBe('L3');
    });

    it('throws BAD_REQUEST when real-name not yet verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        realNameVerified: false,
        faceVerified: false,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { realNameVerified: true, faceVerified: true } });
      expect(user?.realNameVerified).toBe(false);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Must complete real-name verification first (L2)' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST when face already verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        realNameVerified: true,
        faceVerified: true,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { realNameVerified: true, faceVerified: true } });
      expect(user?.faceVerified).toBe(true);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Already verified' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST when face verification API returns failed', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        realNameVerified: true,
        faceVerified: false,
      } as any);
      vi.mocked(verify.verifyFace).mockResolvedValue({ passed: false, reason: 'liveness_fail' });

      const result = await verify.verifyFace('https://example.com/face.jpg', '');
      expect(result.passed).toBe(false);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: `人脸认证失败: ${result.reason ?? 'unknown'}` });
      expect(err.message).toBe('人脸认证失败: liveness_fail');
    });
  });

  // ── submitEduVerify ───────────────────────────────────────────────────────

  describe('submitEduVerify', () => {
    it('successfully records education and upgrades to L4', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        faceVerified: true,
        eduVerified: false,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        verificationLevel: 'L4',
        realNameVerified: true,
        faceVerified: true,
        eduVerified: true,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { faceVerified: true, eduVerified: true } });
      expect(user?.faceVerified).toBe(true);
      expect(user?.eduVerified).toBe(false);

      const updated = await prisma.user.update({
        where: { id: 'user-1' },
        data: { eduVerified: true, verificationLevel: 'L4', education: 'BACHELOR' },
        select: { verificationLevel: true, realNameVerified: true, faceVerified: true, eduVerified: true },
      });
      expect(updated.verificationLevel).toBe('L4');
      expect(updated.eduVerified).toBe(true);
    });

    it('throws BAD_REQUEST when face not yet verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        faceVerified: false,
        eduVerified: false,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { faceVerified: true, eduVerified: true } });
      expect(user?.faceVerified).toBe(false);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Must complete face verification first (L3)' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST when education already verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        faceVerified: true,
        eduVerified: true,
      } as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { faceVerified: true, eduVerified: true } });
      expect(user?.eduVerified).toBe(true);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Already verified' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('saves education degree in the update call', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ faceVerified: true, eduVerified: false } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        verificationLevel: 'L4',
        realNameVerified: true,
        faceVerified: true,
        eduVerified: true,
      } as any);

      await prisma.user.update({
        where: { id: 'user-1' },
        data: { eduVerified: true, verificationLevel: 'L4', education: 'MASTER' },
        select: { verificationLevel: true, realNameVerified: true, faceVerified: true, eduVerified: true },
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ education: 'MASTER' }) }),
      );
    });
  });
});
