import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { sms } from '../../adapters/sms.adapter';
import { logger } from '../../lib/logger';

export const safetyRouter = router({
  /** Save emergency contact */
  setEmergencyContact: protectedProcedure
    .input(z.object({ phone: z.string().regex(/^1\d{10}$/, '请输入有效手机号') }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { emergencyContact: input.phone },
        select: { emergencyContact: true },
      });
    }),

  /** Get emergency contact */
  getEmergencyContact: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { emergencyContact: true },
    });
    return { phone: user?.emergencyContact ?? null };
  }),

  /** Create date check-in */
  createCheckin: protectedProcedure
    .input(
      z.object({
        partnerName: z.string().min(1).max(50),
        partnerUserId: z.string().optional(),
        location: z.string().min(1).max(200),
        scheduledAt: z.string().datetime(),
        expectedEndAt: z.string().datetime(),
      })
      .refine((data) => new Date(data.scheduledAt) > new Date(), {
        message: '预约时间不能是过去',
        path: ['scheduledAt'],
      })
      .refine((data) => new Date(data.expectedEndAt) > new Date(data.scheduledAt), {
        message: '结束时间必须晚于开始时间',
        path: ['expectedEndAt'],
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { emergencyContact: true, nickname: true },
      });
      if (!user?.emergencyContact) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: '请先设置紧急联系人',
        });
      }

      const existing = await ctx.prisma.dateCheckin.findFirst({
        where: { userId: ctx.user.id, status: 'ACTIVE' },
      });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '你已有一个进行中的约会报备，请先确认安全后再创建新的',
        });
      }

      const checkin = await ctx.prisma.dateCheckin.create({
        data: {
          userId: ctx.user.id,
          partnerName: input.partnerName,
          partnerUserId: input.partnerUserId,
          location: input.location,
          scheduledAt: new Date(input.scheduledAt),
          expectedEndAt: new Date(input.expectedEndAt),
        },
      });

      // Notify emergency contact
      await sms.sendMessage(
        user.emergencyContact,
        `【安全报备】${user.nickname}将于${new Date(input.scheduledAt).toLocaleString('zh-CN')}在${input.location}与${input.partnerName}约会。如有异常请联系平台。`,
      );

      logger.info('date checkin created', {
        userId: ctx.user.id,
        checkinId: checkin.id,
      });
      return checkin;
    }),

  /** Confirm safe after date */
  confirmSafe: protectedProcedure
    .input(z.object({ checkinId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const checkin = await ctx.prisma.dateCheckin.findFirst({
        where: { id: input.checkinId, userId: ctx.user.id },
      });
      if (!checkin) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '报备记录不存在' });
      }
      if (checkin.status === 'SAFE') return checkin;
      return ctx.prisma.dateCheckin.update({
        where: { id: input.checkinId },
        data: { status: 'SAFE', safeConfirmedAt: new Date() },
      });
    }),

  /** Trigger SOS — send location + alert to emergency contact */
  triggerSOS: protectedProcedure
    .input(
      z
        .object({
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { emergencyContact: true, nickname: true },
      });
      if (!user?.emergencyContact) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: '请先设置紧急联系人',
        });
      }

      const locationStr =
        input?.latitude && input?.longitude
          ? `位置：${input.latitude},${input.longitude}`
          : '位置未知';

      await sms.sendMessage(
        user.emergencyContact,
        `【紧急求助】${user.nickname}触发了紧急求助！${locationStr}。请立即联系确认安全。`,
      );

      // Update any active checkins to SOS_TRIGGERED
      const updated = await ctx.prisma.dateCheckin.updateMany({
        where: { userId: ctx.user.id, status: 'ACTIVE' },
        data: { status: 'SOS_TRIGGERED', sosTriggeredAt: new Date() },
      });
      // No active checkin — create standalone SOS record for audit trail
      if (updated.count === 0) {
        await ctx.prisma.dateCheckin.create({
          data: {
            userId: ctx.user.id,
            partnerName: '未知',
            location: locationStr,
            scheduledAt: new Date(),
            expectedEndAt: new Date(),
            status: 'SOS_TRIGGERED',
            sosTriggeredAt: new Date(),
          },
        });
      }

      logger.warn('SOS triggered', { userId: ctx.user.id, location: input });
      return { success: true };
    }),

  /** List user's checkins */
  myCheckins: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dateCheckin.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }),
});
