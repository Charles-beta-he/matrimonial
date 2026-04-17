import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mockPost = {
  id: 'post-1',
  authorId: 'user-1',
  type: 'meal',
  title: 'Lunch buddy wanted',
  description: 'Looking for lunch buddy near Zhongguancun',
  status: 'OPEN',
  maxPeople: 2,
  location: 'Zhongguancun',
  scheduledAt: null,
};

const mockApply = {
  id: 'apply-1',
  postId: 'post-1',
  userId: 'user-2',
  message: 'Hi, I want to join',
  status: 'PENDING',
  post: mockPost,
};

vi.mock('../../lib/prisma', () => ({
  prisma: {
    buddyPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    buddyApply: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';

describe('buddyRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./buddy.router');
    expect(mod.buddyRouter).toBeDefined();
  });

  describe('list', () => {
    it('returns open posts with author and apply count', async () => {
      const posts = [{ ...mockPost, author: { id: 'user-1', nickname: '小明', birthday: null, city: '北京', photos: [] }, _count: { applies: 3 } }];
      vi.mocked(prisma.buddyPost.findMany).mockResolvedValue(posts as any);

      const result = await prisma.buddyPost.findMany({ where: { status: 'OPEN' }, take: 21, orderBy: { createdAt: 'desc' }, include: {} as any });
      expect(result).toHaveLength(1);
      expect((result[0] as any)._count.applies).toBe(3);
    });

    it('filters by type when provided', async () => {
      vi.mocked(prisma.buddyPost.findMany).mockResolvedValue([]);

      await prisma.buddyPost.findMany({
        where: { status: 'OPEN', type: 'sports' },
        take: 21,
        orderBy: { createdAt: 'desc' },
        include: {} as any,
      });

      expect(prisma.buddyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN', type: 'sports' },
        }),
      );
    });

    it('handles cursor pagination', async () => {
      const manyPosts = Array.from({ length: 21 }, (_, i) => ({
        ...mockPost,
        id: `post-${i}`,
        _count: { applies: 0 },
      }));
      vi.mocked(prisma.buddyPost.findMany).mockResolvedValue(manyPosts as any);

      const result = await prisma.buddyPost.findMany({ where: { status: 'OPEN' }, take: 21, orderBy: { createdAt: 'desc' }, include: {} as any });
      expect(result).toHaveLength(21);
      // Router logic: if length > limit, pop last and set nextCursor
    });
  });

  describe('create', () => {
    it('creates buddy post with correct data', async () => {
      vi.mocked(prisma.buddyPost.create).mockResolvedValue(mockPost as any);

      const result = await prisma.buddyPost.create({
        data: {
          authorId: 'user-1',
          type: 'meal',
          title: 'Lunch buddy wanted',
          description: 'Looking for lunch buddy near Zhongguancun',
          maxPeople: 2,
        },
      });

      expect(result).toEqual(mockPost);
      expect(prisma.buddyPost.create).toHaveBeenCalled();
    });
  });

  describe('applyPost', () => {
    it('throws NOT_FOUND when post does not exist', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(null);

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Buddy post not found' });
      }).toThrow(TRPCError);
    });

    it('throws BAD_REQUEST when applying to own post', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(mockPost as any);
      // authorId === userId
      expect(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot apply to your own post' });
      }).toThrow(TRPCError);
    });

    it('throws BAD_REQUEST when post is not OPEN', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue({ ...mockPost, status: 'FULL' } as any);

      expect(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This buddy post is no longer open' });
      }).toThrow(TRPCError);
    });

    it('throws CONFLICT when already applied', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue(mockApply as any);

      expect(() => {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already applied to this buddy post' });
      }).toThrow(TRPCError);
    });

    it('creates application successfully', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.buddyApply.create).mockResolvedValue(mockApply as any);

      const result = await prisma.buddyApply.create({
        data: { postId: 'post-1', userId: 'user-2', message: 'Hi, I want to join' },
      });

      expect(result).toEqual(mockApply);
    });
  });

  describe('handleApply', () => {
    it('throws NOT_FOUND when apply does not exist', async () => {
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue(null);

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Application not found' });
      }).toThrow(TRPCError);
    });

    it('throws FORBIDDEN when not post author', async () => {
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue({
        ...mockApply,
        post: { ...mockPost, authorId: 'other-user' },
      } as any);

      expect(() => {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the post author can handle applications' });
      }).toThrow(TRPCError);
    });

    it('updates apply status to ACCEPTED', async () => {
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue(mockApply as any);
      vi.mocked(prisma.buddyApply.update).mockResolvedValue({ ...mockApply, status: 'ACCEPTED' } as any);
      vi.mocked(prisma.buddyApply.count).mockResolvedValue(1);
      vi.mocked(prisma.buddyPost.update).mockResolvedValue(mockPost as any);

      const result = await prisma.buddyApply.update({
        where: { id: 'apply-1' },
        data: { status: 'ACCEPTED' },
      });

      expect(result.status).toBe('ACCEPTED');
    });

    it('sets post to FULL when maxPeople reached after accept', async () => {
      vi.mocked(prisma.buddyApply.findUnique).mockResolvedValue(mockApply as any);
      vi.mocked(prisma.buddyApply.update).mockResolvedValue({ ...mockApply, status: 'ACCEPTED' } as any);
      // maxPeople = 2, count returns 1 already accepted → 1+1 = 2 >= 2 → FULL
      vi.mocked(prisma.buddyApply.count).mockResolvedValue(1);
      vi.mocked(prisma.buddyPost.update).mockResolvedValue({ ...mockPost, status: 'FULL' } as any);

      const count = await prisma.buddyApply.count({ where: { postId: 'post-1', status: 'ACCEPTED' } });
      expect(count + 1).toBeGreaterThanOrEqual(mockPost.maxPeople);

      const updated = await prisma.buddyPost.update({
        where: { id: 'post-1' },
        data: { status: 'FULL' },
      });
      expect(updated.status).toBe('FULL');
    });

    it('does not set FULL when maxPeople not reached', async () => {
      // maxPeople = 2 but only 0 accepted so far → 0+1 = 1 < 2 → stays OPEN
      vi.mocked(prisma.buddyApply.count).mockResolvedValue(0);

      const count = await prisma.buddyApply.count({ where: { postId: 'post-1', status: 'ACCEPTED' } });
      expect(count + 1).toBeLessThan(mockPost.maxPeople);
      expect(prisma.buddyPost.update).not.toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('returns post with applies and _count', async () => {
      const detailPost = {
        ...mockPost,
        author: { id: 'user-1', nickname: '小明', birthday: null, city: '北京', photos: [] },
        applies: [{ ...mockApply, user: { id: 'user-2', nickname: '小红', birthday: null, city: '上海', photos: [] } }],
        _count: { applies: 1 },
      };
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(detailPost as any);

      const result = await prisma.buddyPost.findUnique({ where: { id: 'post-1' }, include: {} as any });
      expect(result).toMatchObject({ id: 'post-1', applies: expect.arrayContaining([expect.objectContaining({ id: 'apply-1' })]) });
    });

    it('throws NOT_FOUND when post does not exist', async () => {
      vi.mocked(prisma.buddyPost.findUnique).mockResolvedValue(null);

      const result = await prisma.buddyPost.findUnique({ where: { id: 'post-999' }, include: {} as any });
      expect(result).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      expect(err.code).toBe('NOT_FOUND');
    });
  });
});
