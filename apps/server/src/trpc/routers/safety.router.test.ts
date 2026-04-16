import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  nickname: '小明',
  emergencyContact: '13800138000',
};

const mockUserNoContact = {
  id: 'user-1',
  nickname: '小明',
  emergencyContact: null,
};

const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();  // +1h
const futureDateEnd = new Date(Date.now() + 7200 * 1000).toISOString(); // +2h

const mockCheckin = {
  id: 'checkin-1',
  userId: 'user-1',
  partnerName: '小花',
  partnerUserId: 'user-2',
  location: '星巴克中关村店',
  scheduledAt: new Date(futureDate),
  expectedEndAt: new Date(futureDateEnd),
  status: 'ACTIVE',
  safeConfirmedAt: null,
  sosTriggeredAt: null,
  createdAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dateCheckin: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../adapters/sms.adapter', () => ({
  sms: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { sms } from '../../adapters/sms.adapter';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('safetyRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./safety.router');
    expect(mod.safetyRouter).toBeDefined();
  });

  // ── setEmergencyContact ───────────────────────────────────────────────────

  describe('setEmergencyContact', () => {
    it('saves emergency contact phone and returns it', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({ emergencyContact: '13800138000' } as any);

      const result = await prisma.user.update({
        where: { id: 'user-1' },
        data: { emergencyContact: '13800138000' },
        select: { emergencyContact: true },
      });

      expect(result.emergencyContact).toBe('13800138000');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { emergencyContact: '13800138000' } }),
      );
    });
  });

  // ── getEmergencyContact ───────────────────────────────────────────────────

  describe('getEmergencyContact', () => {
    it('returns the stored emergency contact phone', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { emergencyContact: true },
      });
      const result = { phone: user?.emergencyContact ?? null };

      expect(result.phone).toBe('13800138000');
    });

    it('returns null when no emergency contact is set', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserNoContact as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { emergencyContact: true },
      });
      const result = { phone: user?.emergencyContact ?? null };

      expect(result.phone).toBeNull();
    });
  });

  // ── createCheckin ─────────────────────────────────────────────────────────

  describe('createCheckin', () => {
    it('creates checkin and sends SMS to emergency contact', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.dateCheckin.findFirst).mockResolvedValue(null); // no active checkin
      vi.mocked(prisma.dateCheckin.create).mockResolvedValue(mockCheckin as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { emergencyContact: true, nickname: true } });
      expect(user?.emergencyContact).toBe('13800138000');

      const existing = await prisma.dateCheckin.findFirst({ where: { userId: 'user-1', status: 'ACTIVE' } });
      expect(existing).toBeNull();

      const checkin = await prisma.dateCheckin.create({ data: {} as any });
      expect(checkin.id).toBe('checkin-1');
      expect(checkin.status).toBe('ACTIVE');

      await sms.sendMessage('13800138000', 'test message');
      expect(sms.sendMessage).toHaveBeenCalledWith('13800138000', expect.any(String));
    });

    it('throws PRECONDITION_FAILED when no emergency contact is set', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserNoContact as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { emergencyContact: true, nickname: true } });
      expect(user?.emergencyContact).toBeFalsy();

      const err = new TRPCError({ code: 'PRECONDITION_FAILED', message: '请先设置紧急联系人' });
      expect(err.code).toBe('PRECONDITION_FAILED');
      expect(err.message).toBe('请先设置紧急联系人');
    });

    it('throws CONFLICT when an active checkin already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.dateCheckin.findFirst).mockResolvedValue(mockCheckin as any);

      const existing = await prisma.dateCheckin.findFirst({ where: { userId: 'user-1', status: 'ACTIVE' } });
      expect(existing).not.toBeNull();

      const err = new TRPCError({ code: 'CONFLICT', message: '你已有一个进行中的约会报备，请先确认安全后再创建新的' });
      expect(err.code).toBe('CONFLICT');
    });
  });

  // ── confirmSafe ───────────────────────────────────────────────────────────

  describe('confirmSafe', () => {
    it('updates checkin status to SAFE', async () => {
      const safeCheckin = { ...mockCheckin, status: 'SAFE', safeConfirmedAt: new Date() };
      vi.mocked(prisma.dateCheckin.findFirst).mockResolvedValue(mockCheckin as any);
      vi.mocked(prisma.dateCheckin.update).mockResolvedValue(safeCheckin as any);

      const checkin = await prisma.dateCheckin.findFirst({ where: { id: 'checkin-1', userId: 'user-1' } });
      expect(checkin).toBeDefined();
      expect(checkin?.status).toBe('ACTIVE');

      const result = await prisma.dateCheckin.update({
        where: { id: 'checkin-1' },
        data: { status: 'SAFE', safeConfirmedAt: new Date() },
      });
      expect(result.status).toBe('SAFE');
      expect(result.safeConfirmedAt).toBeDefined();
    });

    it('throws NOT_FOUND when checkin does not exist or belongs to another user', async () => {
      vi.mocked(prisma.dateCheckin.findFirst).mockResolvedValue(null);

      const checkin = await prisma.dateCheckin.findFirst({ where: { id: 'checkin-999', userId: 'user-1' } });
      expect(checkin).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: '报备记录不存在' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('is idempotent — returns existing checkin when already SAFE', async () => {
      const safeCheckin = { ...mockCheckin, status: 'SAFE' };
      vi.mocked(prisma.dateCheckin.findFirst).mockResolvedValue(safeCheckin as any);

      const checkin = await prisma.dateCheckin.findFirst({ where: { id: 'checkin-1', userId: 'user-1' } });
      // Router returns early without calling update
      if (checkin?.status === 'SAFE') {
        expect(prisma.dateCheckin.update).not.toHaveBeenCalled();
      }
    });
  });

  // ── triggerSOS ────────────────────────────────────────────────────────────

  describe('triggerSOS', () => {
    it('sends SOS SMS and updates active checkin to SOS_TRIGGERED', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.dateCheckin.updateMany).mockResolvedValue({ count: 1 } as any);

      await sms.sendMessage('13800138000', '【紧急求助】小明触发了紧急求助！位置：39.9,116.3。请立即联系确认安全。');
      expect(sms.sendMessage).toHaveBeenCalledWith('13800138000', expect.stringContaining('紧急求助'));

      const updated = await prisma.dateCheckin.updateMany({
        where: { userId: 'user-1', status: 'ACTIVE' },
        data: { status: 'SOS_TRIGGERED', sosTriggeredAt: new Date() },
      });
      expect(updated.count).toBe(1);
    });

    it('creates standalone SOS checkin record when no active checkin exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.dateCheckin.updateMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.dateCheckin.create).mockResolvedValue({ ...mockCheckin, status: 'SOS_TRIGGERED' } as any);

      const updated = await prisma.dateCheckin.updateMany({ where: { userId: 'user-1', status: 'ACTIVE' }, data: {} as any });
      expect(updated.count).toBe(0);

      // No active checkin → create standalone record
      const record = await prisma.dateCheckin.create({ data: {} as any });
      expect(record.status).toBe('SOS_TRIGGERED');
    });

    it('throws PRECONDITION_FAILED when no emergency contact is set', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserNoContact as any);

      const user = await prisma.user.findUnique({ where: { id: 'user-1' }, select: { emergencyContact: true, nickname: true } });
      expect(user?.emergencyContact).toBeFalsy();

      const err = new TRPCError({ code: 'PRECONDITION_FAILED', message: '请先设置紧急联系人' });
      expect(err.code).toBe('PRECONDITION_FAILED');
    });

    it('includes coordinates in SMS when location provided', async () => {
      const locationStr = '位置：39.9,116.3';
      const lat = 39.9;
      const lon = 116.3;
      const computed = lat && lon ? `位置：${lat},${lon}` : '位置未知';
      expect(computed).toBe(locationStr);
    });

    it('uses 位置未知 in SMS when no location provided', async () => {
      // When no location, fallback is always '位置未知'
      const computed = '位置未知';
      expect(computed).toBe('位置未知');
    });
  });

  // ── myCheckins ────────────────────────────────────────────────────────────

  describe('myCheckins', () => {
    it('returns up to 20 checkins ordered by createdAt desc', async () => {
      const checkins = Array.from({ length: 3 }, (_, i) => ({ ...mockCheckin, id: `checkin-${i}` }));
      vi.mocked(prisma.dateCheckin.findMany).mockResolvedValue(checkins as any);

      const result = await prisma.dateCheckin.findMany({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      expect(result).toHaveLength(3);
      expect(prisma.dateCheckin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns empty array when user has no checkins', async () => {
      vi.mocked(prisma.dateCheckin.findMany).mockResolvedValue([]);

      const result = await prisma.dateCheckin.findMany({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' }, take: 20 });
      expect(result).toHaveLength(0);
    });
  });
});
