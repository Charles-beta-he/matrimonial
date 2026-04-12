import {
  updatePreferenceSchema,
  updateProfileSchema,
  updatePhotoSchema,
  updatePromptSchema,
} from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../base';

export const userRouter = router({
  /** Get current user's full profile */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        tags: true,
        prompts: { orderBy: { order: 'asc' } },
        preferences: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  }),

  /** Get a user by ID (public fields only) */
  getById: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: input },
      select: {
        id: true,
        nickname: true,
        gender: true,
        birthday: true,
        city: true,
        bio: true,
        height: true,
        education: true,
        occupation: true,
        hometown: true,
        zodiac: true,
        mbti: true,
        verificationLevel: true,
        membership: true,
        lastActiveAt: true,
        isOnline: true,
        photos: {
          where: { auditStatus: 'APPROVED' },
          orderBy: { order: 'asc' },
        },
        tags: true,
        prompts: { orderBy: { order: 'asc' } },
      },
    });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  }),

  /** Update profile fields and tags */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const { tags, ...profile } = input;
      if (tags !== undefined) {
        await ctx.prisma.userTag.deleteMany({
          where: { userId: ctx.user.id },
        });
        if (tags.length > 0) {
          await ctx.prisma.userTag.createMany({
            data: tags.map((tag) => ({ userId: ctx.user.id, tag })),
          });
        }
      }
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: profile,
      });
    }),

  /** Update user photos — replaces all existing photos */
  updatePhotos: protectedProcedure
    .input(updatePhotoSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.photo.deleteMany({
        where: { userId: ctx.user.id },
      });
      await ctx.prisma.photo.createMany({
        data: input.photos.map((photo) => ({
          userId: ctx.user.id,
          url: photo.url,
          order: photo.order,
          isAvatar: photo.isAvatar,
        })),
      });
      return ctx.prisma.photo.findMany({
        where: { userId: ctx.user.id },
        orderBy: { order: 'asc' },
      });
    }),

  /** Update user prompts — replaces all existing prompts */
  updatePrompts: protectedProcedure
    .input(z.array(updatePromptSchema))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.userPrompt.deleteMany({
        where: { userId: ctx.user.id },
      });
      await ctx.prisma.userPrompt.createMany({
        data: input.map((prompt) => ({
          userId: ctx.user.id,
          questionId: prompt.questionId,
          answerText: prompt.answerText,
          answerAudioUrl: prompt.answerAudioUrl,
          answerVideoUrl: prompt.answerVideoUrl,
          order: prompt.order,
        })),
      });
      return ctx.prisma.userPrompt.findMany({
        where: { userId: ctx.user.id },
        orderBy: { order: 'asc' },
      });
    }),

  /** Update dating preferences */
  updatePreferences: protectedProcedure
    .input(updatePreferenceSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.preference.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...input },
        update: input,
      });
    }),

  /** Update last active time and online status */
  updateLastActive: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { lastActiveAt: new Date(), isOnline: true },
      select: { lastActiveAt: true, isOnline: true },
    });
  }),

  /** Record a profile view (fire-and-forget) */
  recordView: protectedProcedure
    .input(z.object({ viewedId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.viewedId === ctx.user.id) return { skipped: true };
      await ctx.prisma.profileView.upsert({
        where: {
          viewerId_viewedId: {
            viewerId: ctx.user.id,
            viewedId: input.viewedId,
          },
        },
        update: { createdAt: new Date() },
        create: { viewerId: ctx.user.id, viewedId: input.viewedId },
      });
      return { success: true };
    }),

  /** Get visitors (members-only; UI gate is elsewhere) */
  visitors: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      const views = await ctx.prisma.profileView.findMany({
        where: { viewedId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
      const viewerIds = views.map((v) => v.viewerId);
      const viewers = await ctx.prisma.user.findMany({
        where: { id: { in: viewerIds } },
        select: {
          id: true,
          nickname: true,
          birthday: true,
          city: true,
          photos: { where: { isAvatar: true }, take: 1 },
        },
      });
      return views.map((v) => {
        const viewer = viewers.find((u) => u.id === v.viewerId);
        return { ...viewer, viewedAt: v.createdAt };
      });
    }),
});
