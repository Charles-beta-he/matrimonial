import { createOrderSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { PaymentService } from '../../modules/payment/payment.service';
import { AppleIapAdapter } from '../../adapters/apple-iap.adapter';
import { logger } from '../../lib/logger';

export const paymentRouter = router({
  /** Create a payment order — returns channel-specific prepay params */
  createOrder: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      return PaymentService.createOrder(
        ctx.user.id,
        input.productType,
        input.productId,
        input.channel,
      );
    }),

  /** List the current user's orders */
  getOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.paymentOrder.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /** Get current membership status */
  membershipStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { membership: true, membershipExpiry: true },
    });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    const isActive =
      user.membership &&
      user.membership !== 'FREE' &&
      user.membershipExpiry &&
      user.membershipExpiry > new Date();

    return {
      plan: user.membership ?? 'FREE',
      expiry: user.membershipExpiry,
      isActive: !!isActive,
    };
  }),

  /** Verify Apple IAP receipt and mark order paid */
  verifyApplePay: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        receiptData: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.paymentOrder.findFirst({
        where: { id: input.orderId, userId: ctx.user.id },
      });
      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
      }
      if (order.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '订单状态异常，非待支付状态',
        });
      }

      logger.info('apple iap verify start', {
        orderId: order.id,
        receiptLen: input.receiptData.length,
      });

      const result = await AppleIapAdapter.verifyReceipt(input.receiptData);

      if (!result.valid) {
        logger.warn('apple iap verify failed', {
          orderId: order.id,
          status: result.status,
        });
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Apple 验证失败 (status: ${result.status})`,
        });
      }

      const tradeNo = result.transactionId ?? `apple_${Date.now()}`;

      logger.info('apple iap verify success', {
        orderId: order.id,
        tradeNo,
        environment: result.environment,
        productId: result.productId,
      });

      await PaymentService.markOrderPaid(order.id, tradeNo);
      return { success: true, orderId: order.id };
    }),

  /** Request a refund — 7天无理由退款 */
  requestRefund: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await PaymentService.processRefund(input.orderId, ctx.user.id);
      logger.info('refund requested', { userId: ctx.user.id, orderId: input.orderId });
      return { success: true, order };
    }),

  /** Manually activate membership from a PAID order (legacy) */
  activateMembership: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.paymentOrder.findFirst({
        where: {
          id: input.orderId,
          userId: ctx.user.id,
          productType: 'MEMBERSHIP',
        },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }
      if (order.status !== 'PAID') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order is not paid yet',
        });
      }

      // Re-run markOrderPaid side effects (idempotent re. order.status, but
      // ensures membership is applied if a prior run failed half-way).
      await PaymentService.markOrderPaid(order.id, order.tradeNo ?? 'manual');

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { membership: true, membershipExpiry: true },
      });
      return { plan: user?.membership, expiry: user?.membershipExpiry };
    }),
});
