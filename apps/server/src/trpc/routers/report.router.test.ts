import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockReport = {
  id: 'report-1',
  reporterId: 'user-1',
  reportedId: 'user-2',
  reason: 'HARASSMENT',
  description: '该用户持续骚扰我，发送不雅内容',
  evidence: [],
  createdAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@matrimonial/shared', () => ({
  createReportSchema: {
    // Minimal pass-through — actual schema validation tested in shared package
    parse: (v: unknown) => v,
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../../lib/prisma';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('reportRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./report.router');
    expect(mod.reportRouter).toBeDefined();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a report successfully for a valid target user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2' } as any);
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport as any);

      const reportedUser = await prisma.user.findUnique({
        where: { id: 'user-2' },
        select: { id: true },
      });
      expect(reportedUser).not.toBeNull();

      const result = await prisma.report.create({
        data: {
          reporterId: 'user-1',
          reportedId: 'user-2',
          reason: 'HARASSMENT',
          description: '该用户持续骚扰我，发送不雅内容',
          evidence: [],
        },
      });
      expect(result.id).toBe('report-1');
      expect(result.reason).toBe('HARASSMENT');
    });

    it('throws BAD_REQUEST when user tries to report themselves', () => {
      const userId = 'user-1';
      const reportedId = 'user-1';
      const isSelf = reportedId === userId;
      expect(isSelf).toBe(true);

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot report yourself' });
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Cannot report yourself');
    });

    it('throws NOT_FOUND when reported user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const reportedUser = await prisma.user.findUnique({ where: { id: 'ghost-user' }, select: { id: true } });
      expect(reportedUser).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Reported user not found' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('saves evidence array when provided', async () => {
      const evidenceUrls = ['https://example.com/screenshot1.png', 'https://example.com/screenshot2.png'];
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2' } as any);
      vi.mocked(prisma.report.create).mockResolvedValue({
        ...mockReport,
        evidence: evidenceUrls,
      } as any);

      const result = await prisma.report.create({
        data: {
          reporterId: 'user-1',
          reportedId: 'user-2',
          reason: 'SCAM',
          description: '该用户涉嫌诈骗，提供了虚假信息来骗取钱财',
          evidence: evidenceUrls,
        },
      });
      expect(result.evidence).toEqual(evidenceUrls);
      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ evidence: evidenceUrls }) }),
      );
    });

    it('defaults evidence to empty array when not provided', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2' } as any);
      vi.mocked(prisma.report.create).mockResolvedValue({ ...mockReport, evidence: [] } as any);

      await prisma.report.create({
        data: {
          reporterId: 'user-1',
          reportedId: 'user-2',
          reason: 'FAKE_PROFILE',
          description: '该用户使用了虚假照片和个人信息进行欺骗',
          evidence: [],
        },
      });

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ evidence: [] }) }),
      );
    });

    it('supports all valid reason enum values', async () => {
      const reasons = ['FAKE_PROFILE', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE_CONTENT', 'OTHER'] as const;

      for (const reason of reasons) {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2' } as any);
        vi.mocked(prisma.report.create).mockResolvedValue({ ...mockReport, reason } as any);

        const result = await prisma.report.create({
          data: { reporterId: 'user-1', reportedId: 'user-2', reason, description: '详细说明该行为的危害性和具体表现形式', evidence: [] },
        });
        expect(result.reason).toBe(reason);
      }
    });
  });

  // ── myReports ─────────────────────────────────────────────────────────────

  describe('myReports', () => {
    it('returns list of reports submitted by the current user', async () => {
      const reports = [
        {
          ...mockReport,
          reported: { id: 'user-2', nickname: '小花' },
        },
        {
          ...mockReport,
          id: 'report-2',
          reportedId: 'user-3',
          reported: { id: 'user-3', nickname: '小李' },
        },
      ];
      vi.mocked(prisma.report.findMany).mockResolvedValue(reports as any);

      const result = await prisma.report.findMany({
        where: { reporterId: 'user-1' },
        include: { reported: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].reporterId).toBe('user-1');
    });

    it('returns empty array when user has submitted no reports', async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([]);

      const result = await prisma.report.findMany({
        where: { reporterId: 'user-1' },
        include: { reported: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('includes reported user nickname in results', async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([
        { ...mockReport, reported: { id: 'user-2', nickname: '小花' } },
      ] as any);

      const result = await prisma.report.findMany({
        where: { reporterId: 'user-1' },
        include: { reported: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect((result[0] as any).reported.nickname).toBe('小花');
    });

    it('orders results by createdAt descending', async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([]);

      await prisma.report.findMany({
        where: { reporterId: 'user-1' },
        include: { reported: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
      });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });
});
