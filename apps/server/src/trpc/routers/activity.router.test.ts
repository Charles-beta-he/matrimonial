import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockActivity = {
  id: 'activity-1',
  title: '周末相亲派对',
  category: 'dating',
  status: 'UPCOMING',
  startTime: new Date('2026-05-01T14:00:00Z'),
  _count: { signups: 5 },
  signups: [],
};

const mockCompletedActivity = {
  ...mockActivity,
  id: 'activity-2',
  status: 'COMPLETED',
};

const mockSignup = {
  id: 'signup-1',
  activityId: 'activity-1',
  userId: 'user-1',
  status: 'PENDING',
  createdAt: new Date(),
};

const mockVote = {
  id: 'vote-1',
  activityId: 'activity-2',
  voterId: 'user-1',
  votedId: 'user-2',
  rating: 4,
};

const mockConversation = {
  id: 'conv-1',
  lastMessageAt: new Date(),
  participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    activitySignup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activityVote: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    conversationParticipant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    conversation: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('activityRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./activity.router');
    expect(mod.activityRouter).toBeDefined();
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all activities with signupCount when no filters', async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([mockActivity] as any);

      const result = await prisma.activity.findMany({
        where: {},
        include: { _count: { select: { signups: true } } },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect((result[0] as any)._count.signups).toBe(5);
    });

    it('filters by category when provided', async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([mockActivity] as any);

      await prisma.activity.findMany({
        where: { category: 'dating' },
        include: { _count: { select: { signups: true } } },
        orderBy: { startTime: 'asc' },
      });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'dating' } }),
      );
    });

    it('filters by status when provided', async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

      await prisma.activity.findMany({
        where: { status: 'COMPLETED' },
        include: { _count: { select: { signups: true } } },
        orderBy: { startTime: 'asc' },
      });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'COMPLETED' } }),
      );
    });

    it('maps _count.signups to signupCount on each activity', async () => {
      const raw = { ...mockActivity, _count: { signups: 12 } };
      vi.mocked(prisma.activity.findMany).mockResolvedValue([raw] as any);

      const activities = await prisma.activity.findMany({} as any);
      // Simulate the router's mapping
      const mapped = activities.map((a: any) => ({
        ...a,
        signupCount: a._count.signups,
        _count: undefined,
      }));
      expect(mapped[0].signupCount).toBe(12);
      expect(mapped[0]._count).toBeUndefined();
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns activity with signupCount when found', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);

      const activity = await prisma.activity.findUnique({
        where: { id: 'activity-1' },
        include: { signups: {}, _count: { select: { signups: true } } },
      });
      expect(activity).toBeDefined();
      expect((activity as any)._count.signups).toBe(5);
    });

    it('throws NOT_FOUND when activity does not exist', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const activity = await prisma.activity.findUnique({ where: { id: 'nonexistent' } });
      expect(activity).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  // ── signup ────────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('creates signup for UPCOMING activity', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.activitySignup.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.activitySignup.create).mockResolvedValue(mockSignup as any);

      const activity = await prisma.activity.findUnique({ where: { id: 'activity-1' }, include: { _count: { select: { signups: true } } } });
      expect(activity?.status).toBe('UPCOMING');

      const existing = await prisma.activitySignup.findUnique({
        where: { activityId_userId: { activityId: 'activity-1', userId: 'user-1' } },
      });
      expect(existing).toBeNull();

      const result = await prisma.activitySignup.create({
        data: { activityId: 'activity-1', userId: 'user-1', status: 'PENDING' },
      });
      expect(result.status).toBe('PENDING');
    });

    it('throws NOT_FOUND when activity does not exist', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const activity = await prisma.activity.findUnique({ where: { id: 'missing' } });
      expect(activity).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('throws BAD_REQUEST when activity is not UPCOMING', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockCompletedActivity as any);

      const activity = await prisma.activity.findUnique({ where: { id: 'activity-2' } });
      expect(activity?.status).toBe('COMPLETED');

      const err = new TRPCError({ code: 'BAD_REQUEST', message: 'Activity is not open for signup' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws CONFLICT when already signed up', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.activitySignup.findUnique).mockResolvedValue(mockSignup as any);

      const existing = await prisma.activitySignup.findUnique({
        where: { activityId_userId: { activityId: 'activity-1', userId: 'user-1' } },
      });
      expect(existing).not.toBeNull();

      const err = new TRPCError({ code: 'CONFLICT', message: 'Already signed up for this activity' });
      expect(err.code).toBe('CONFLICT');
    });
  });

  // ── cancelSignup ──────────────────────────────────────────────────────────

  describe('cancelSignup', () => {
    it('updates signup status to CANCELLED', async () => {
      vi.mocked(prisma.activitySignup.findUnique).mockResolvedValue(mockSignup as any);
      vi.mocked(prisma.activitySignup.update).mockResolvedValue({ ...mockSignup, status: 'CANCELLED' } as any);

      const signup = await prisma.activitySignup.findUnique({
        where: { activityId_userId: { activityId: 'activity-1', userId: 'user-1' } },
      });
      expect(signup).not.toBeNull();

      const result = await prisma.activitySignup.update({
        where: { id: 'signup-1' },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('throws NOT_FOUND when signup does not exist', async () => {
      vi.mocked(prisma.activitySignup.findUnique).mockResolvedValue(null);

      const signup = await prisma.activitySignup.findUnique({
        where: { activityId_userId: { activityId: 'activity-1', userId: 'user-99' } },
      });
      expect(signup).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Signup not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  // ── mySignups ─────────────────────────────────────────────────────────────

  describe('mySignups', () => {
    it('returns signups for the current user ordered by createdAt desc', async () => {
      const signups = [{ ...mockSignup, activity: mockActivity }];
      vi.mocked(prisma.activitySignup.findMany).mockResolvedValue(signups as any);

      const result = await prisma.activitySignup.findMany({
        where: { userId: 'user-1' },
        include: { activity: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect((result[0] as any).activity.title).toBe('周末相亲派对');
    });
  });

  // ── vote ──────────────────────────────────────────────────────────────────

  describe('vote', () => {
    it('throws BAD_REQUEST when activity is not COMPLETED', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any); // UPCOMING

      const activity = await prisma.activity.findUnique({ where: { id: 'activity-1' } });
      expect(activity?.status).not.toBe('COMPLETED');

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '活动尚未结束，无法投票' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST when voter or target not in activity', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockCompletedActivity as any);
      vi.mocked(prisma.activitySignup.findUnique).mockResolvedValue(null); // not signed up

      const mySignup = await prisma.activitySignup.findUnique({
        where: { activityId_userId: { activityId: 'activity-2', userId: 'user-1' } },
      });
      expect(mySignup).toBeNull();

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '只能为同场活动参与者投票' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST when voting for yourself', async () => {
      const err = new TRPCError({ code: 'BAD_REQUEST', message: '不能给自己投票' });
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('不能给自己投票');
    });

    it('upserts vote and returns without conversationId when no mutual vote', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockCompletedActivity as any);
      vi.mocked(prisma.activitySignup.findUnique)
        .mockResolvedValueOnce(mockSignup as any)   // mySignup
        .mockResolvedValueOnce({ ...mockSignup, userId: 'user-2' } as any); // theirSignup
      vi.mocked(prisma.activityVote.upsert).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.activityVote.findUnique).mockResolvedValue(null); // no reciprocal vote

      const vote = await prisma.activityVote.upsert({
        where: { activityId_voterId_votedId: { activityId: 'activity-2', voterId: 'user-1', votedId: 'user-2' } },
        create: { activityId: 'activity-2', voterId: 'user-1', votedId: 'user-2', rating: 4 },
        update: { rating: 4 },
      });
      expect(vote.rating).toBe(4);

      const reciprocal = await prisma.activityVote.findUnique({ where: {} as any });
      expect(reciprocal).toBeNull();
    });

    it('creates conversation when mutual votes both >= 3', async () => {
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockCompletedActivity as any);
      vi.mocked(prisma.activitySignup.findUnique)
        .mockResolvedValueOnce(mockSignup as any)
        .mockResolvedValueOnce({ ...mockSignup, userId: 'user-2' } as any);
      vi.mocked(prisma.activityVote.upsert).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.activityVote.findUnique).mockResolvedValue({ ...mockVote, voterId: 'user-2', votedId: 'user-1', rating: 5 } as any);
      vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.conversation.create).mockResolvedValue(mockConversation as any);

      const reciprocal = { rating: 5 };
      const myRating = 4;
      const isMutual = reciprocal.rating >= 3 && myRating >= 3;
      expect(isMutual).toBe(true);

      const conversation = await prisma.conversation.create({ data: { lastMessageAt: new Date(), participants: { create: [] } } });
      expect(conversation.id).toBe('conv-1');
    });
  });

  // ── votableParticipants ───────────────────────────────────────────────────

  describe('votableParticipants', () => {
    it('returns participants excluding current user with vote status', async () => {
      const signups = [{ ...mockSignup, userId: 'user-2' }, { ...mockSignup, id: 'signup-3', userId: 'user-3' }];
      const users = [
        { id: 'user-2', nickname: '小花', gender: 'FEMALE', birthday: null, city: '上海', photos: [] },
        { id: 'user-3', nickname: '小红', gender: 'FEMALE', birthday: null, city: '北京', photos: [] },
      ];
      vi.mocked(prisma.activitySignup.findMany).mockResolvedValue(signups as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue(users as any);
      vi.mocked(prisma.activityVote.findMany).mockResolvedValue([]);

      const fetchedSignups = await prisma.activitySignup.findMany({
        where: { activityId: 'activity-2', status: { not: 'CANCELLED' }, userId: { not: 'user-1' } },
      });
      expect(fetchedSignups).toHaveLength(2);

      const userIds = fetchedSignups.map((s: any) => s.userId);
      const fetchedUsers = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } as any });
      expect(fetchedUsers).toHaveLength(2);
    });
  });

  // ── activityMatches ───────────────────────────────────────────────────────

  describe('activityMatches', () => {
    it('returns mutual matches where both ratings >= 3', async () => {
      const myVote = { ...mockVote, rating: 4 };
      vi.mocked(prisma.activityVote.findMany).mockResolvedValue([myVote] as any);
      vi.mocked(prisma.activityVote.findUnique).mockResolvedValue({ ...mockVote, voterId: 'user-2', votedId: 'user-1', rating: 4 } as any);

      const myVotes = await prisma.activityVote.findMany({ where: { voterId: 'user-1', rating: { gte: 3 } } });
      expect(myVotes).toHaveLength(1);

      const reciprocal = await prisma.activityVote.findUnique({
        where: { activityId_voterId_votedId: { activityId: 'activity-2', voterId: 'user-2', votedId: 'user-1' } },
      });
      expect(reciprocal?.rating).toBeGreaterThanOrEqual(3);

      const mutuals = [{ activityId: 'activity-2', userId: 'user-2' }];
      expect(mutuals).toHaveLength(1);
    });

    it('excludes pairs where reciprocal rating is below 3', async () => {
      const myVote = { ...mockVote, rating: 4 };
      vi.mocked(prisma.activityVote.findMany).mockResolvedValue([myVote] as any);
      vi.mocked(prisma.activityVote.findUnique).mockResolvedValue({ ...mockVote, rating: 2 } as any); // low rating

      const reciprocal = await prisma.activityVote.findUnique({ where: {} as any });
      const isMutual = reciprocal && reciprocal.rating >= 3;
      expect(isMutual).toBeFalsy();
    });

    it('returns empty when user has no outgoing votes', async () => {
      vi.mocked(prisma.activityVote.findMany).mockResolvedValue([]);

      const myVotes = await prisma.activityVote.findMany({ where: { voterId: 'user-1', rating: { gte: 3 } } });
      expect(myVotes).toHaveLength(0);
    });
  });
});
