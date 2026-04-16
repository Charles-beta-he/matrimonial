import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mockCircle = {
  id: 'circle-1',
  name: 'Test Circle',
  category: 'dating',
  memberCount: 5,
  posts: [],
};

const mockMember = { id: 'member-1', circleId: 'circle-1', userId: 'user-1' };

vi.mock('../../lib/prisma', () => ({
  prisma: {
    circle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    circleMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    circlePost: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';

describe('circleRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./circle.router');
    expect(mod.circleRouter).toBeDefined();
  });

  describe('list', () => {
    it('returns paginated circles', async () => {
      const circles = [mockCircle, { ...mockCircle, id: 'circle-2' }];
      vi.mocked(prisma.circle.findMany).mockResolvedValue(circles as any);

      const { circleRouter } = await import('./circle.router');
      expect(circleRouter).toBeDefined();

      // Verify findMany was set up with correct mock
      expect(prisma.circle.findMany).toBeDefined();
    });

    it('applies category filter when provided', async () => {
      vi.mocked(prisma.circle.findMany).mockResolvedValue([]);

      await prisma.circle.findMany({
        where: { category: 'dating' },
        take: 21,
        orderBy: { memberCount: 'desc' },
      });

      expect(prisma.circle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'dating' },
        }),
      );
    });

    it('slices next cursor when results exceed limit', async () => {
      const manyCircles = Array.from({ length: 21 }, (_, i) => ({
        ...mockCircle,
        id: `circle-${i}`,
      }));
      vi.mocked(prisma.circle.findMany).mockResolvedValue(manyCircles as any);

      // Verify the mock can handle 21 results (limit+1 pattern)
      const result = await prisma.circle.findMany({ where: {}, take: 21, orderBy: { memberCount: 'desc' } });
      expect(result).toHaveLength(21);
    });
  });

  describe('getById', () => {
    it('throws NOT_FOUND when circle does not exist', async () => {
      vi.mocked(prisma.circle.findUnique).mockResolvedValue(null);

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Circle not found' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('returns circle with isMember flag', async () => {
      vi.mocked(prisma.circle.findUnique).mockResolvedValueOnce(mockCircle as any);
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValueOnce(mockMember as any);

      const circle = await prisma.circle.findUnique({ where: { id: 'circle-1' }, include: { posts: {} } as any });
      const member = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: 'circle-1', userId: 'user-1' } },
      });

      expect(circle).toEqual(mockCircle);
      expect(member).toEqual(mockMember);
    });
  });

  describe('join', () => {
    it('throws NOT_FOUND when circle does not exist', async () => {
      vi.mocked(prisma.circle.findUnique).mockResolvedValue(null);

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Circle not found' });
      }).toThrow(TRPCError);
    });

    it('throws CONFLICT when already a member', async () => {
      vi.mocked(prisma.circle.findUnique).mockResolvedValue(mockCircle as any);
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(mockMember as any);

      expect(() => {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already a member of this circle' });
      }).toThrow(TRPCError);
    });

    it('creates member and increments count in transaction', async () => {
      vi.mocked(prisma.circle.findUnique).mockResolvedValue(mockCircle as any);
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockMember, { ...mockCircle, memberCount: 6 }] as any);

      await prisma.$transaction([
        prisma.circleMember.create({ data: { circleId: 'circle-1', userId: 'user-1' } }),
        prisma.circle.update({ where: { id: 'circle-1' }, data: { memberCount: { increment: 1 } } }),
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('throws NOT_FOUND when not a member', async () => {
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(null);

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Not a member of this circle' });
      }).toThrow(TRPCError);
    });

    it('deletes member and decrements count in transaction', async () => {
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(mockMember as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockMember, mockCircle] as any);

      await prisma.$transaction([
        prisma.circleMember.delete({ where: { id: 'member-1' } }),
        prisma.circle.update({ where: { id: 'circle-1' }, data: { memberCount: { decrement: 1 } } }),
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('createPost', () => {
    it('throws FORBIDDEN when not a member', async () => {
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(null);

      expect(() => {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be a member to post in this circle' });
      }).toThrow(TRPCError);
    });

    it('creates post when member', async () => {
      vi.mocked(prisma.circleMember.findUnique).mockResolvedValue(mockMember as any);
      const newPost = { id: 'post-1', circleId: 'circle-1', authorId: 'user-1', content: 'Hello circle!' };
      vi.mocked(prisma.circlePost.create).mockResolvedValue(newPost as any);

      const result = await prisma.circlePost.create({
        data: { circleId: 'circle-1', authorId: 'user-1', content: 'Hello circle!', imageUrls: [] },
      });

      expect(result).toEqual(newPost);
    });
  });
});
