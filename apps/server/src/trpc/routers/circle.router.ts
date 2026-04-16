import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../base';

export const circleRouter = router({
  /** List circles, optionally filtered by category */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = {};
      if (input.category) where.category = input.category;

      const circles = await ctx.prisma.circle.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { memberCount: 'desc' },
      });

      let nextCursor: string | undefined;
      if (circles.length > input.limit) {
        const next = circles.pop();
        nextCursor = next?.id;
      }

      return { items: circles, nextCursor };
    }),

  /** Get circle detail with recent posts */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const circle = await ctx.prisma.circle.findUnique({
        where: { id: input.id },
        include: {
          posts: {
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: { id: true, nickname: true, photos: { where: { isAvatar: true }, take: 1, select: { url: true } } },
              },
            },
          },
        },
      });

      if (!circle) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Circle not found',
        });
      }

      const isMember = await ctx.prisma.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId: input.id,
            userId: ctx.user.id,
          },
        },
      });

      return { ...circle, isMember: !!isMember };
    }),

  /** Join a circle */
  join: protectedProcedure
    .input(z.object({ circleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const circle = await ctx.prisma.circle.findUnique({
        where: { id: input.circleId },
      });
      if (!circle) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Circle not found',
        });
      }

      const existing = await ctx.prisma.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId: input.circleId,
            userId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already a member of this circle',
        });
      }

      const [member] = await ctx.prisma.$transaction([
        ctx.prisma.circleMember.create({
          data: { circleId: input.circleId, userId },
        }),
        ctx.prisma.circle.update({
          where: { id: input.circleId },
          data: { memberCount: { increment: 1 } },
        }),
      ]);

      return member;
    }),

  /** Leave a circle */
  leave: protectedProcedure
    .input(z.object({ circleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const existing = await ctx.prisma.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId: input.circleId,
            userId,
          },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Not a member of this circle',
        });
      }

      await ctx.prisma.$transaction([
        ctx.prisma.circleMember.delete({
          where: { id: existing.id },
        }),
        ctx.prisma.circle.update({
          where: { id: input.circleId },
          data: { memberCount: { decrement: 1 } },
        }),
      ]);

      return { success: true };
    }),

  /** Create a post in a circle (must be member) */
  createPost: protectedProcedure
    .input(
      z.object({
        circleId: z.string(),
        content: z.string().min(1).max(2000),
        imageUrls: z.array(z.string()).max(9).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const isMember = await ctx.prisma.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId: input.circleId,
            userId,
          },
        },
      });
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a member to post in this circle',
        });
      }

      return ctx.prisma.circlePost.create({
        data: {
          circleId: input.circleId,
          authorId: userId,
          content: input.content,
          imageUrls: input.imageUrls,
        },
      });
    }),

  /** Paginated posts for a circle */
  posts: protectedProcedure
    .input(
      z.object({
        circleId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const posts = await ctx.prisma.circlePost.findMany({
        where: { circleId: input.circleId },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, nickname: true, photos: { where: { isAvatar: true }, take: 1, select: { url: true } } },
          },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const next = posts.pop();
        nextCursor = next?.id;
      }

      return { items: posts, nextCursor };
    }),
});
