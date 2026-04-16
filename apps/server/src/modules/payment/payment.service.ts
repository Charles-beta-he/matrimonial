import { TRPCError } from '@trpc/server';
import { findProduct } from '@matrimonial/shared';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { WechatPayAdapter } from '../../adapters/wechat-pay.adapter';
import { AlipayAdapter } from '../../adapters/alipay.adapter';
import { CreditsService } from '../credits/credits.service';

export const PaymentService = {
  async createOrder(
    userId: string,
    productType: string,
    productId: string,
    channel: 'wechat' | 'alipay' | 'apple_iap',
  ) {
    const product = findProduct(productId);
    if (!product) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '商品不存在' });
    }
    if (product.type !== productType) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '商品类型不匹配' });
    }

    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        productType: productType as any,
        productId,
        amount: product.price / 100, // store as yuan decimal
        status: 'PENDING',
        channel,
      },
    });

    if (channel === 'wechat') {
      const prepay = await WechatPayAdapter.createPrepay({
        orderId: order.id,
        amount: product.price,
        description: product.name,
      });
      return {
        orderId: order.id,
        channel,
        amount: product.price,
        wechatPayParams: prepay.payParams,
      };
    }

    if (channel === 'alipay') {
      const prepay = await AlipayAdapter.createPrepay({
        orderId: order.id,
        amount: product.price,
        subject: product.name,
        body: product.description,
      });
      return {
        orderId: order.id,
        channel,
        amount: product.price,
        alipayParams: { orderString: prepay.orderString },
      };
    }

    if (channel === 'apple_iap') {
      // Apple IAP: client pays directly via StoreKit, server verifies receipt later
      return { orderId: order.id, channel, amount: product.price };
    }

    throw new TRPCError({ code: 'BAD_REQUEST', message: '不支持的支付渠道' });
  },

  async markOrderPaid(orderId: string, tradeNo: string) {
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) return null;
    if (order.status === 'PAID') return order; // idempotent

    const updated = await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'PAID', tradeNo, paidAt: new Date() },
    });

    // Activate product based on type
    if (order.productType === 'MEMBERSHIP') {
      const pid = order.productId ?? '';
      const days = pid.includes('YEARLY') ? 365 : pid.includes('QUARTERLY') ? 90 : 30;
      const plan = pid.includes('YEARLY')
        ? 'YEARLY'
        : pid.includes('QUARTERLY')
          ? 'QUARTERLY'
          : 'MONTHLY';
      const now = new Date();
      const currentUser = await prisma.user.findUnique({
        where: { id: order.userId },
      });
      const currentExpiry =
        currentUser?.membershipExpiry && currentUser.membershipExpiry > now
          ? currentUser.membershipExpiry
          : now;
      const newExpiry = new Date(
        currentExpiry.getTime() + days * 24 * 60 * 60 * 1000,
      );
      await prisma.user.update({
        where: { id: order.userId },
        data: { membership: plan as any, membershipExpiry: newExpiry },
      });
      logger.info('membership activated', {
        userId: order.userId,
        plan,
        expiry: newExpiry.toISOString(),
      });
    }

    // Grant consumable credits
    if (order.productType === 'SUPER_LIKE') {
      const quantity = order.productId?.includes('_20') ? 20 : 5;
      await CreditsService.grant(order.userId, 'SUPER_LIKE', quantity, 'payment_order', orderId);
    }

    if (order.productType === 'LOVE_LETTER') {
      await CreditsService.grant(order.userId, 'LOVE_LETTER', 1, 'payment_order', orderId);
    }

    if (order.productType === 'VIDEO_TICKET') {
      await CreditsService.grant(order.userId, 'VIDEO_TICKET', 1, 'payment_order', orderId);
    }

    if (order.productType === 'BOOST') {
      // productId like BOOST_30MIN — extract minutes
      const minuteMatch = order.productId?.match(/BOOST_(\d+)MIN/);
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 30;
      await CreditsService.grant(order.userId, 'BOOST', minutes, 'payment_order', orderId);
    }

    return updated;
  },

  async processRefund(orderId: string, userId: string) {
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
    }
    if (order.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
    }
    if (order.status !== 'PAID') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '订单状态不支持退款' });
    }

    // Check for refunds in last 30 days (max 1 refund per month)
    const recentRefund = await prisma.paymentOrder.findFirst({
      where: {
        userId: order.userId,
        status: 'REFUNDED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentRefund) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: '每30天只能申请一次退款',
      });
    }

    // 7天无理由退款: only refund within 7 days of paidAt
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (!order.paidAt || Date.now() - order.paidAt.getTime() > sevenDaysMs) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '已超过7天退款期限' });
    }

    // TODO: Integrate Alipay/WeChat refund API to actually refund the payment
    // For now, only update internal state.

    // Revoke product in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const refundedOrder = await tx.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });

      if (order.productType === 'MEMBERSHIP') {
        await tx.user.update({
          where: { id: userId },
          data: { membership: 'FREE', membershipExpiry: null },
        });
        logger.info('membership revoked on refund', { userId, orderId });
      }

      // Revoke consumable credits — only revoke unspent portion
      if (order.productType === 'SUPER_LIKE') {
        const purchasedAmount = order.productId?.includes('_20') ? 20 : 5;
        const creditRecord = await prisma.userCredits.findUnique({
          where: { userId: order.userId },
          select: { superLikes: true },
        });
        const currentBalance = creditRecord?.superLikes ?? 0;
        const toRevoke = Math.min(currentBalance, purchasedAmount);
        if (toRevoke > 0) {
          await prisma.userCredits.update({
            where: { userId: order.userId },
            data: { superLikes: { decrement: toRevoke } },
          });
        }
      }

      if (order.productType === 'LOVE_LETTER') {
        try {
          await CreditsService.consume(userId, 'LOVE_LETTER', 1, 'refund');
        } catch {
          // Credits already used — nothing to revoke
        }
      }

      if (order.productType === 'VIDEO_TICKET') {
        try {
          await CreditsService.consume(userId, 'VIDEO_TICKET', 1, 'refund');
        } catch {
          // Credits already used — nothing to revoke
        }
      }

      if (order.productType === 'BOOST') {
        // Boost is time-based; clear remaining boost time
        await tx.userCredits.update({
          where: { userId },
          data: { boostUntil: null },
        }).catch(() => {
          // No credits record — nothing to revoke
        });
        logger.info('boost revoked on refund', { userId, orderId });
      }

      return refundedOrder;
    });

    logger.info('refund processed', { userId, orderId, productType: order.productType });
    return updated;
  },
};
