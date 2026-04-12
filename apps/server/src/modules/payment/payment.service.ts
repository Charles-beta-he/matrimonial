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
      const minutes = 30;  // default
      await CreditsService.grant(order.userId, 'BOOST', minutes, 'payment_order', orderId);
    }

    return updated;
  },
};
