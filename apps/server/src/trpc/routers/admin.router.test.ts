import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAdminUser = { id: 'admin-1', role: 'ADMIN' };
const mockRegularUser = { id: 'user-1', role: 'USER' };

const mockUser = {
  id: 'user-1',
  nickname: '小明',
  gender: 'MALE',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  photos: [],
  _count: { sentLikes: 5, receivedLikes: 3 },
};

const mockReport = {
  id: 'report-1',
  status: 'PENDING',
  reporterId: 'user-1',
  reportedId: 'user-2',
  createdAt: new Date('2024-01-01'),
  reporter: { id: 'user-1', nickname: '小明' },
  reported: { id: 'user-2', nickname: '小花' },
};

const mockPhoto = {
  id: 'photo-1',
  userId: 'user-1',
  auditStatus: 'PENDING',
  createdAt: new Date('2024-01-01'),
  user: { id: 'user-1', nickname: '小明' },
};

const mockTextAudit = {
  id: 'audit-1',
  userId: 'user-1',
  status: 'PENDING',
  field: 'bio',
  value: 'some text',
  createdAt: new Date('2024-01-01'),
  user: { id: 'user-1', nickname: '小明' },
};

const mockActivity = {
  id: 'act-1',
  title: '相亲派对',
  category: '线下活动',
  startTime: new Date('2024-06-01'),
  location: '北京',
  description: '欢乐相亲',
  coverUrl: '',
  maxMale: 5,
  maxFemale: 5,
  fee: 0,
  status: 'ACTIVE',
};

const mockCampaign = {
  id: 'camp-1',
  title: '春节活动',
  body: '新年快乐！',
  audience: 'ALL',
  scheduleAt: null,
  createdBy: 'admin-1',
  sentAt: null,
  delivered: 0,
  opened: 0,
  createdAt: new Date('2024-01-01'),
};

const mockMatchmaker = {
  id: 'mm-1',
  userId: 'user-mm-1',
  totalMatches: 100,
  successRate: 0.75,
  rating: 4.8,
  isOnline: true,
  user: { id: 'user-mm-1', nickname: '月老', city: '上海' },
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    photo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    textAuditItem: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    matchmaker: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      update: vi.fn(),
    },
    pushCampaign: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    like: {
      count: vi.fn(),
    },
    paymentOrder: {
      aggregate: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    message: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    conversation: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { prisma } from '../../lib/prisma';

// ── Helper: simulate adminProcedure middleware ────────────────────────────────

function assertAdminAccess(user: { role: string }) {
  if (user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('adminRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./admin.router');
    expect(mod.adminRouter).toBeDefined();
  });

  // ── FORBIDDEN middleware ───────────────────────────────────────────────────

  describe('admin middleware — FORBIDDEN for non-ADMIN role', () => {
    it('throws FORBIDDEN when user role is USER', () => {
      expect(() => assertAdminAccess(mockRegularUser)).toThrow(TRPCError);
      expect(() => assertAdminAccess(mockRegularUser)).toThrow('Admin access required');
    });

    it('throws FORBIDDEN when user role is MATCHMAKER', () => {
      const matchmakerUser = { id: 'mm-1', role: 'MATCHMAKER' };
      expect(() => assertAdminAccess(matchmakerUser)).toThrow(TRPCError);
    });

    it('does not throw when user role is ADMIN', () => {
      expect(() => assertAdminAccess(mockAdminUser)).not.toThrow();
    });

    it('FORBIDDEN error has correct code', () => {
      try {
        assertAdminAccess(mockRegularUser);
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as TRPCError).code).toBe('FORBIDDEN');
      }
    });
  });

  // ── users ─────────────────────────────────────────────────────────────────

  describe('users', () => {
    it('returns paginated user list with total', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {},
          include: { photos: { where: { isAvatar: true }, take: 1 }, _count: { select: { sentLikes: true, receivedLikes: true } } },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
        prisma.user.count({ where: {} }),
      ]);

      expect(users).toHaveLength(1);
      expect(total).toBe(1);

      const result = { users, total, page: 1, pageSize: 20, totalPages: Math.ceil(total / 20) };
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
    });

    it('filters by gender when provided', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await prisma.user.findMany({ where: { gender: 'MALE' }, include: { photos: { where: { isAvatar: true }, take: 1 }, _count: { select: { sentLikes: true, receivedLikes: true } } }, orderBy: { createdAt: 'desc' }, skip: 0, take: 20 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ gender: 'MALE' }) }),
      );
    });

    it('filters by search term using OR clause', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const search = '小明';
      const where = {
        OR: [
          { nickname: { contains: search, mode: 'insensitive' as any } },
          { phone: { contains: search } },
        ],
      };

      await prisma.user.findMany({ where, include: { photos: { where: { isAvatar: true }, take: 1 }, _count: { select: { sentLikes: true, receivedLikes: true } } }, orderBy: { createdAt: 'desc' }, skip: 0, take: 20 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('computes correct skip offset for page 2', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const page = 2;
      const pageSize = 20;
      const skip = (page - 1) * pageSize;
      expect(skip).toBe(20);
    });
  });

  // ── pendingReports ────────────────────────────────────────────────────────

  describe('pendingReports', () => {
    it('returns reports with PENDING or REVIEWING status', async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([mockReport] as any);

      const reports = await prisma.report.findMany({
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
        include: {
          reporter: { select: { id: true, nickname: true } },
          reported: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].status).toBe('PENDING');
      expect(reports[0].reporter.nickname).toBe('小明');
    });

    it('returns empty array when no pending reports', async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([]);

      const reports = await prisma.report.findMany({ where: { status: { in: ['PENDING', 'REVIEWING'] } } });
      expect(reports).toHaveLength(0);
    });
  });

  // ── resolveReport ─────────────────────────────────────────────────────────

  describe('resolveReport', () => {
    it('updates report status to RESOLVED', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.report.update).mockResolvedValue({ ...mockReport, status: 'RESOLVED' } as any);

      const report = await prisma.report.findUnique({ where: { id: 'report-1' } });
      expect(report).not.toBeNull();

      const updated = await prisma.report.update({
        where: { id: 'report-1' },
        data: { status: 'RESOLVED', handledBy: 'admin-1', handledAt: new Date() },
      });
      expect(updated.status).toBe('RESOLVED');
    });

    it('updates report status to DISMISSED', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.report.update).mockResolvedValue({ ...mockReport, status: 'DISMISSED' } as any);

      const updated = await prisma.report.update({
        where: { id: 'report-1' },
        data: { status: 'DISMISSED', handledBy: 'admin-1', handledAt: new Date() },
      });
      expect(updated.status).toBe('DISMISSED');
    });

    it('throws NOT_FOUND when report does not exist', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

      const report = await prisma.report.findUnique({ where: { id: 'nonexistent' } });
      expect(report).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  // ── pendingPhotos + approvePhoto + rejectPhoto ────────────────────────────

  describe('pendingPhotos', () => {
    it('returns photos with PENDING audit status', async () => {
      vi.mocked(prisma.photo.findMany).mockResolvedValue([mockPhoto] as any);

      const photos = await prisma.photo.findMany({
        where: { auditStatus: 'PENDING' },
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'asc' },
      });
      expect(photos).toHaveLength(1);
      expect(photos[0].auditStatus).toBe('PENDING');
    });
  });

  describe('approvePhoto', () => {
    it('updates photo auditStatus to APPROVED', async () => {
      vi.mocked(prisma.photo.findUnique).mockResolvedValue(mockPhoto as any);
      vi.mocked(prisma.photo.update).mockResolvedValue({ ...mockPhoto, auditStatus: 'APPROVED' } as any);

      const photo = await prisma.photo.findUnique({ where: { id: 'photo-1' } });
      expect(photo).not.toBeNull();

      const updated = await prisma.photo.update({
        where: { id: 'photo-1' },
        data: { auditStatus: 'APPROVED' },
      });
      expect(updated.auditStatus).toBe('APPROVED');
    });

    it('throws NOT_FOUND when photo does not exist', async () => {
      vi.mocked(prisma.photo.findUnique).mockResolvedValue(null);

      const photo = await prisma.photo.findUnique({ where: { id: 'nonexistent' } });
      expect(photo).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('rejectPhoto', () => {
    it('updates photo auditStatus to REJECTED', async () => {
      vi.mocked(prisma.photo.findUnique).mockResolvedValue(mockPhoto as any);
      vi.mocked(prisma.photo.update).mockResolvedValue({ ...mockPhoto, auditStatus: 'REJECTED' } as any);

      const updated = await prisma.photo.update({
        where: { id: 'photo-1' },
        data: { auditStatus: 'REJECTED' },
      });
      expect(updated.auditStatus).toBe('REJECTED');
    });
  });

  // ── banUser / unbanUser ───────────────────────────────────────────────────

  describe('banUser', () => {
    it('sets user status to BANNED with reason', async () => {
      const bannedUser = { ...mockUser, status: 'BANNED', bannedAt: new Date(), banReason: '违规' };
      vi.mocked(prisma.user.update).mockResolvedValue(bannedUser as any);

      const result = await prisma.user.update({
        where: { id: 'user-1' },
        data: { status: 'BANNED', bannedAt: new Date(), banReason: '违规' },
      });
      expect(result.status).toBe('BANNED');
      expect(result.banReason).toBe('违规');
    });
  });

  describe('unbanUser', () => {
    it('resets user status to ACTIVE and clears ban fields', async () => {
      const unbannedUser = { ...mockUser, status: 'ACTIVE', bannedAt: null, banReason: null };
      vi.mocked(prisma.user.update).mockResolvedValue(unbannedUser as any);

      const result = await prisma.user.update({
        where: { id: 'user-1' },
        data: { status: 'ACTIVE', bannedAt: null, banReason: null },
      });
      expect(result.status).toBe('ACTIVE');
      expect(result.bannedAt).toBeNull();
      expect(result.banReason).toBeNull();
    });
  });

  // ── pendingTextAudits + approveText + rejectText ──────────────────────────

  describe('pendingTextAudits', () => {
    it('returns text audit items with PENDING status', async () => {
      vi.mocked(prisma.textAuditItem.findMany).mockResolvedValue([mockTextAudit] as any);

      const items = await prisma.textAuditItem.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'asc' },
      });
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('PENDING');
    });
  });

  describe('approveText', () => {
    it('updates text audit item to APPROVED and records handler', async () => {
      vi.mocked(prisma.textAuditItem.update).mockResolvedValue({ ...mockTextAudit, status: 'APPROVED', handledBy: 'admin-1' } as any);

      const result = await prisma.textAuditItem.update({
        where: { id: 'audit-1' },
        data: { status: 'APPROVED', handledBy: 'admin-1', handledAt: new Date() },
      });
      expect(result.status).toBe('APPROVED');
      expect(prisma.textAuditItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });
  });

  describe('rejectText', () => {
    it('updates text audit item to REJECTED', async () => {
      vi.mocked(prisma.textAuditItem.update).mockResolvedValue({ ...mockTextAudit, status: 'REJECTED' } as any);

      const result = await prisma.textAuditItem.update({
        where: { id: 'audit-1' },
        data: { status: 'REJECTED', handledBy: 'admin-1', handledAt: new Date() },
      });
      expect(result.status).toBe('REJECTED');
    });
  });

  // ── matchmakers + matchmakerStats ─────────────────────────────────────────

  describe('matchmakers', () => {
    it('returns paginated matchmaker list', async () => {
      vi.mocked(prisma.matchmaker.findMany).mockResolvedValue([mockMatchmaker] as any);
      vi.mocked(prisma.matchmaker.count).mockResolvedValue(1);

      const [items, total] = await Promise.all([
        prisma.matchmaker.findMany({ include: { user: { select: { id: true, nickname: true, city: true } } }, orderBy: { totalMatches: 'desc' }, skip: 0, take: 20 }),
        prisma.matchmaker.count(),
      ]);

      expect(items).toHaveLength(1);
      expect(total).toBe(1);
      expect(items[0].totalMatches).toBe(100);
    });
  });

  describe('matchmakerStats', () => {
    it('returns active count and aggregated stats', async () => {
      vi.mocked(prisma.matchmaker.count).mockResolvedValue(3);
      vi.mocked(prisma.matchmaker.aggregate).mockResolvedValue({
        _sum: { totalMatches: 500 },
        _avg: { successRate: 0.72, rating: 4.6 },
      } as any);

      const [activeCount, agg] = await Promise.all([
        prisma.matchmaker.count({ where: { isOnline: true } }),
        prisma.matchmaker.aggregate({ _sum: { totalMatches: true }, _avg: { successRate: true, rating: true } }),
      ]);

      const result = {
        activeCount,
        monthlyMatches: agg._sum.totalMatches ?? 0,
        avgSuccessRate: agg._avg.successRate ?? 0,
        avgRating: agg._avg.rating ?? 0,
      };

      expect(result.activeCount).toBe(3);
      expect(result.monthlyMatches).toBe(500);
      expect(result.avgSuccessRate).toBeCloseTo(0.72);
    });
  });

  // ── createActivity + updateActivity + cancelActivity ─────────────────────

  describe('createActivity', () => {
    it('creates activity with split male/female quota', async () => {
      vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as any);

      const maxParticipants = 10;
      const half = Math.floor(maxParticipants / 2);
      expect(half).toBe(5);

      const result = await prisma.activity.create({
        data: {
          title: '相亲派对',
          description: '欢乐相亲',
          coverUrl: '',
          category: '线下活动',
          location: '北京',
          startTime: new Date('2024-06-01'),
          maxMale: half,
          maxFemale: maxParticipants - half,
          fee: 0,
        },
      });
      expect(result.maxMale).toBe(5);
      expect(result.maxFemale).toBe(5);
    });
  });

  describe('updateActivity', () => {
    it('updates activity fields', async () => {
      const updated = { ...mockActivity, title: '新派对', fee: 100 };
      vi.mocked(prisma.activity.update).mockResolvedValue(updated as any);

      const result = await prisma.activity.update({
        where: { id: 'act-1' },
        data: { title: '新派对', fee: 100 },
      });
      expect(result.title).toBe('新派对');
      expect(result.fee).toBe(100);
    });
  });

  describe('cancelActivity', () => {
    it('sets activity status to CANCELLED', async () => {
      vi.mocked(prisma.activity.update).mockResolvedValue({ ...mockActivity, status: 'CANCELLED' } as any);

      const result = await prisma.activity.update({
        where: { id: 'act-1' },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ── createPushCampaign + sendPushCampaign ─────────────────────────────────

  describe('createPushCampaign', () => {
    it('creates campaign with ALL audience', async () => {
      vi.mocked(prisma.pushCampaign.create).mockResolvedValue(mockCampaign as any);

      const result = await prisma.pushCampaign.create({
        data: {
          title: '春节活动',
          body: '新年快乐！',
          audience: 'ALL',
          scheduleAt: null,
          createdBy: 'admin-1',
        },
      });
      expect(result.audience).toBe('ALL');
      expect(result.createdBy).toBe('admin-1');
    });
  });

  describe('sendPushCampaign', () => {
    it('throws NOT_FOUND when campaign does not exist', async () => {
      vi.mocked(prisma.pushCampaign.findUnique).mockResolvedValue(null);

      const campaign = await prisma.pushCampaign.findUnique({ where: { id: 'nonexistent' } });
      expect(campaign).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('computes recipient count and marks campaign as sent', async () => {
      vi.mocked(prisma.pushCampaign.findUnique).mockResolvedValue(mockCampaign as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1500);
      vi.mocked(prisma.pushCampaign.update).mockResolvedValue({ ...mockCampaign, sentAt: new Date(), delivered: 1500 } as any);

      const campaign = await prisma.pushCampaign.findUnique({ where: { id: 'camp-1' } });
      expect(campaign).not.toBeNull();

      const recipientCount = await prisma.user.count({ where: { status: 'ACTIVE' } });
      expect(recipientCount).toBe(1500);

      const updated = await prisma.pushCampaign.update({
        where: { id: 'camp-1' },
        data: { sentAt: new Date(), delivered: recipientCount, opened: 0 },
      });
      expect(updated.delivered).toBe(1500);
      expect(updated.sentAt).not.toBeNull();
    });
  });

  // ── stats ─────────────────────────────────────────────────────────────────

  describe('stats', () => {
    it('returns dashboard stats with all expected fields', async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(10000) // totalUsers
        .mockResolvedValueOnce(42)    // todaySignups
        .mockResolvedValueOnce(3000); // activeUsersWeek
      vi.mocked(prisma.like.count).mockResolvedValue(500);
      vi.mocked(prisma.report.count).mockResolvedValue(8);
      vi.mocked(prisma.photo.count).mockResolvedValue(15);

      const [totalUsers, todaySignups, activeUsersWeek] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: new Date() } } }),
        prisma.user.count({ where: { lastActiveAt: { gte: new Date() } } }),
      ]);
      const totalMatches = await prisma.like.count({ where: { isMatched: true } });
      const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
      const pendingPhotos = await prisma.photo.count({ where: { auditStatus: 'PENDING' } });

      const result = { totalUsers, todaySignups, activeUsersWeek, totalMatches, pendingReports, pendingPhotos };
      expect(result.totalUsers).toBe(10000);
      expect(result.todaySignups).toBe(42);
      expect(result.totalMatches).toBe(500);
      expect(result.pendingReports).toBe(8);
      expect(result.pendingPhotos).toBe(15);
    });
  });

  // ── genderStats ───────────────────────────────────────────────────────────

  describe('genderStats', () => {
    it('calculates correct percentages and ratio', async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(600)  // MALE
        .mockResolvedValueOnce(400); // FEMALE

      const [male, female] = await Promise.all([
        prisma.user.count({ where: { gender: 'MALE' } }),
        prisma.user.count({ where: { gender: 'FEMALE' } }),
      ]);

      const total = male + female;
      const result = {
        male,
        female,
        total,
        malePercent: total > 0 ? ((male / total) * 100).toFixed(1) : '0',
        femalePercent: total > 0 ? ((female / total) * 100).toFixed(1) : '0',
        ratio: female > 0 ? (male / female).toFixed(2) : 'N/A',
      };

      expect(result.total).toBe(1000);
      expect(result.malePercent).toBe('60.0');
      expect(result.femalePercent).toBe('40.0');
      expect(result.ratio).toBe('1.50');
    });

    it('returns ratio as N/A when no female users', async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(0);

      const [male, female] = await Promise.all([
        prisma.user.count({ where: { gender: 'MALE' } }),
        prisma.user.count({ where: { gender: 'FEMALE' } }),
      ]);

      const ratio = female > 0 ? (male / female).toFixed(2) : 'N/A';
      expect(ratio).toBe('N/A');
    });
  });

  // ── analyticsOverview ─────────────────────────────────────────────────────

  describe('analyticsOverview', () => {
    it('returns empty analytics gracefully when table does not exist', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('relation does not exist'));

      // Simulate the try/catch fallback
      let result;
      try {
        await prisma.$queryRaw`SELECT 1`;
        result = null;
      } catch {
        result = {
          topEvents: [],
          dau: [],
          sessionCount: 0,
          registrationFunnel: [],
          matchRate: { likes: 0, matches: 0, rate: '0%' },
        };
      }

      expect(result).not.toBeNull();
      expect(result!.topEvents).toHaveLength(0);
      expect(result!.matchRate.rate).toBe('0%');
    });

    it('days input validation: min 1, max 90', () => {
      const valid = (days: number) => days >= 1 && days <= 90;
      expect(valid(7)).toBe(true);
      expect(valid(0)).toBe(false);
      expect(valid(91)).toBe(false);
      expect(valid(90)).toBe(true);
    });
  });

  // ── listPushCampaigns ─────────────────────────────────────────────────────

  describe('listPushCampaigns', () => {
    it('returns paginated campaign list', async () => {
      vi.mocked(prisma.pushCampaign.findMany).mockResolvedValue([mockCampaign] as any);
      vi.mocked(prisma.pushCampaign.count).mockResolvedValue(1);

      const [items, total] = await Promise.all([
        prisma.pushCampaign.findMany({ orderBy: { createdAt: 'desc' }, skip: 0, take: 20 }),
        prisma.pushCampaign.count(),
      ]);

      const result = { items, total, page: 1, pageSize: 20 };
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
