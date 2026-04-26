import {
  updatePreferenceSchema,
  updateProfileSchema,
  updatePhotoSchema,
  updatePromptSchema,
} from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import type { Membership } from '@prisma/client';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { requireMembership } from '../middlewares/requireMembership';

export const userRouter = router({
  /** Register or update push token for push notifications */
  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { pushToken: input.token },
      });
    }),


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
  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
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
        privacyBlurPhotos: true,
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

    // If target has blurPhotos enabled, check if viewer is matched
    if (user.privacyBlurPhotos && ctx.user.id !== input) {
      const mutualMatch = await ctx.prisma.like.findFirst({
        where: {
          isMatched: true,
          OR: [
            { fromUserId: ctx.user.id, toUserId: input },
            { fromUserId: input, toUserId: ctx.user.id },
          ],
        },
      });
      if (!mutualMatch) {
        // Blur photo URLs for non-matched viewers
        (user as any).photos = user.photos.map((p) => ({
          ...p,
          url: p.url + '?blur=1',
        }));
      }
    }

    // Strip internal privacy field from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { privacyBlurPhotos, ...publicUser } = user;
    return publicUser;
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

  /** Update privacy settings — incognito field requires QUARTERLY membership */
  updatePrivacy: protectedProcedure
    .input(
      z.object({
        blurPhotos: z.boolean().optional(),
        incognito: z.boolean().optional(),
        blockContacts: z.boolean().optional(),
        blurLocation: z.boolean().optional(),
        disableVisitors: z.boolean().optional(),
        blockedPhoneHashes: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Incognito mode is a QUARTERLY+ feature — gate server-side
      if (input.incognito !== undefined) {
        const memberUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { membership: true, membershipExpiry: true },
        });
        const QUARTERLY_RANK = 2;
        const PLAN_RANK: Record<Membership, number> = {
          FREE: 0,
          MONTHLY: 1,
          QUARTERLY: 2,
          YEARLY: 3,
        };
        const plan: Membership = memberUser?.membership ?? 'FREE';
        const expiry = memberUser?.membershipExpiry;
        const isExpired = expiry !== null && expiry !== undefined && expiry < new Date();
        const effectiveRank = isExpired ? 0 : PLAN_RANK[plan];
        if (effectiveRank < QUARTERLY_RANK) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '会员功能 · 升级解锁',
          });
        }
      }

      const data: Record<string, unknown> = {};
      if (input.blurPhotos !== undefined) data.privacyBlurPhotos = input.blurPhotos;
      if (input.incognito !== undefined) data.privacyIncognito = input.incognito;
      if (input.blockContacts !== undefined) data.privacyBlockContacts = input.blockContacts;
      if (input.blurLocation !== undefined) data.privacyBlurLocation = input.blurLocation;
      if (input.disableVisitors !== undefined) data.privacyDisableVisitors = input.disableVisitors;
      if (input.blockedPhoneHashes !== undefined) data.blockedPhoneHashes = input.blockedPhoneHashes;

      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data,
        select: {
          privacyBlurPhotos: true,
          privacyIncognito: true,
          privacyBlockContacts: true,
          privacyBlurLocation: true,
          privacyDisableVisitors: true,
        },
      });
    }),

  /** Request account deletion — marks account PENDING_DELETION with 14-day cooldown */
  requestDeletion: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          status: 'PENDING_DELETION',
          deletionRequestedAt: new Date(),
        },
      });
      return { success: true, deletionAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) };
    }),

  /** Cancel a pending deletion request — restores account to ACTIVE */
  cancelDeletion: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { status: true },
      });
      if (user?.status !== 'PENDING_DELETION') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '账号未申请注销' });
      }
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { status: 'ACTIVE', deletionRequestedAt: null },
      });
      return { success: true };
    }),

  /** Update notification preferences */
  updateNotifPrefs: protectedProcedure
    .input(z.object({
      newMessage: z.boolean().optional(),
      matchSuccess: z.boolean().optional(),
      activityReminder: z.boolean().optional(),
      marketing: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.newMessage !== undefined && { notifNewMessage: input.newMessage }),
          ...(input.matchSuccess !== undefined && { notifMatchSuccess: input.matchSuccess }),
          ...(input.activityReminder !== undefined && { notifActivity: input.activityReminder }),
          ...(input.marketing !== undefined && { notifMarketing: input.marketing }),
        },
        select: {
          notifNewMessage: true,
          notifMatchSuccess: true,
          notifActivity: true,
          notifMarketing: true,
        },
      });
    }),

  /** Get notification preferences */
  getNotifPrefs: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          notifNewMessage: true,
          notifMatchSuccess: true,
          notifActivity: true,
          notifMarketing: true,
        },
      });
      return {
        newMessage: user?.notifNewMessage ?? true,
        matchSuccess: user?.notifMatchSuccess ?? true,
        activityReminder: user?.notifActivity ?? true,
        marketing: user?.notifMarketing ?? false,
      };
    }),

  /** Record a profile view (fire-and-forget) */
  recordView: protectedProcedure
    .input(z.object({ viewedId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.viewedId === ctx.user.id) return { skipped: true };

      // If the viewer has incognito mode enabled, skip recording the view
      const viewer = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { privacyIncognito: true },
      });
      if (viewer?.privacyIncognito) return { skipped: true };

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
      // If the user has disabled visitors, return empty list
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { privacyDisableVisitors: true },
      });
      if (currentUser?.privacyDisableVisitors) return [];

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
