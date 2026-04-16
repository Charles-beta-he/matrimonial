import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../base';

export const buddyRouter = router({
  /** Browse buddy posts */
  list: publicProcedure
    .input(
      z.object({
        type: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = { status: 'OPEN' };
      if (input.type) where.type = input.type;

      const posts = await ctx.prisma.buddyPost.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              birthday: true,
              city: true,
              photos: { where: { isAvatar: true }, take: 1, select: { url: true } },
            },
          },
          _count: { select: { applies: true } },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const next = posts.pop();
        nextCursor = next?.id;
      }

      return {
        items: posts.map((p) => ({
          ...p,
          applyCount: p._count.applies,
          _count: undefined,
        })),
        nextCursor,
      };
    }),

  /** Create a buddy post */
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['meal', 'sports', 'travel', 'movies', 'study', 'other']),
        title: z.string().min(2).max(50),
        description: z.string().min(10).max(500),
        location: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        maxPeople: z.number().min(2).max(10).default(2),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.buddyPost.create({
        data: {
          authorId: ctx.user.id,
          type: input.type,
          title: input.title,
          description: input.description,
          location: input.location,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          maxPeople: input.maxPeople,
        },
      });
    }),

  /** Apply to join a buddy activity */
  apply: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        message: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const post = await ctx.prisma.buddyPost.findUnique({
        where: { id: input.postId },
      });
      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Buddy post not found',
        });
      }
      if (post.authorId === userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot apply to your own post',
        });
      }
      if (post.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This buddy post is no longer open',
        });
      }

      const existing = await ctx.prisma.buddyApply.findUnique({
        where: {
          postId_userId: {
            postId: input.postId,
            userId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already applied to this buddy post',
        });
      }

      return ctx.prisma.buddyApply.create({
        data: {
          postId: input.postId,
          userId,
          message: input.message,
        },
      });
    }),

  /** List my buddy posts with applicants */
  myPosts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.buddyPost.findMany({
      where: { authorId: ctx.user.id },
      include: {
        applies: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                photos: { where: { isAvatar: true }, take: 1, select: { url: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /** Accept or reject an application */
  handleApply: protectedProcedure
    .input(
      z.object({
        applyId: z.string(),
        action: z.enum(['ACCEPTED', 'REJECTED']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const apply = await ctx.prisma.buddyApply.findUnique({
        where: { id: input.applyId },
        include: { post: true },
      });
      if (!apply) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      if (apply.post.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the post author can handle applications',
        });
      }

      const updated = await ctx.prisma.buddyApply.update({
        where: { id: input.applyId },
        data: { status: input.action },
      });

      // Auto-set post to FULL if maxPeople reached
      if (input.action === 'ACCEPTED') {
        const acceptedCount = await ctx.prisma.buddyApply.count({
          where: {
            postId: apply.postId,
            status: 'ACCEPTED',
          },
        });

        // +1 for the author themselves
        if (acceptedCount + 1 >= apply.post.maxPeople) {
          await ctx.prisma.buddyPost.update({
            where: { id: apply.postId },
            data: { status: 'FULL' },
          });
        }
      }

      return updated;
    }),
});
