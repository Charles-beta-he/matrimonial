import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../base';
import { CreditsService } from '../../modules/credits/credits.service';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const inviteRouter = router({
  /** Get or generate my invite code */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { inviteCode: true, inviteCount: true },
    });

    if (user?.inviteCode) {
      return { code: user.inviteCode, inviteCount: user.inviteCount ?? 0 };
    }

    // Generate unique 6-char code (retry on collision)
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCode();
      const existing = await ctx.prisma.user.findUnique({ where: { inviteCode: code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '生成邀请码失败，请重试' });
    }

    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { inviteCode: code },
    });

    return { code, inviteCount: 0 };
  }),

  /** Apply an invite code (called during/after registration) */
  applyCode: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check if already used an invite code
      const me = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { invitedBy: true },
      });
      if (me?.invitedBy) {
        throw new TRPCError({ code: 'CONFLICT', message: '你已经使用过邀请码了' });
      }

      // Find inviter
      const inviter = await ctx.prisma.user.findFirst({
        where: { inviteCode: input.code.toUpperCase() },
        select: { id: true, nickname: true, status: true },
      });
      if (!inviter || inviter.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'NOT_FOUND', message: '邀请码无效' });
      }
      if (inviter.id === userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '不能使用自己的邀请码' });
      }

      // Apply: link invitee to inviter
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { invitedBy: inviter.id },
      });

      // Reward inviter: 3 super likes
      await CreditsService.grant(inviter.id, 'SUPER_LIKE', 3, 'invite_reward');
      // Reward invitee: 2 super likes
      await CreditsService.grant(userId, 'SUPER_LIKE', 2, 'invited_reward');

      // Increment inviteCount after credits are successfully granted
      await ctx.prisma.user.update({
        where: { id: inviter.id },
        data: { inviteCount: { increment: 1 } },
      });

      return { success: true, inviterNickname: inviter.nickname };
    }),

  /** Get my referral stats */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { inviteCode: true, inviteCount: true },
    });

    // Get list of people I invited
    const invitees = await ctx.prisma.user.findMany({
      where: { invitedBy: ctx.user.id },
      select: { nickname: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      code: user?.inviteCode ?? null,
      inviteCount: user?.inviteCount ?? 0,
      invitees,
    };
  }),
});
