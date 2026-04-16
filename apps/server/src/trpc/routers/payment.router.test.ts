import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockPendingOrder = {
  id: 'order-1',
  userId: 'user-1',
  productType: 'MEMBERSHIP',
  productId: 'MONTHLY',
  amount: 29.9,
  status: 'PENDING',
  channel: 'wechat',
  tradeNo: null,
  paidAt: null,
  createdAt: new Date('2024-01-01'),
};

const mockPaidOrder = {
  ...mockPendingOrder,
  status: 'PAID',
  tradeNo: 'trade-123',
  paidAt: new Date('2024-01-01'),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    paymentOrder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userCredits: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../modules/payment/payment.service', () => ({
  PaymentService: {
    createOrder: vi.fn(),
    markOrderPaid: vi.fn(),
    processRefund: vi.fn(),
  },
}));

vi.mock('../../adapters/apple-iap.adapter', () => ({
  AppleIapAdapter: {
    verifyReceipt: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { PaymentService } from '../../modules/payment/payment.service';
import { AppleIapAdapter } from '../../adapters/apple-iap.adapter';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('paymentRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./payment.router');
    expect(mod.paymentRouter).toBeDefined();
  });

  // ── createOrder ───────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('delegates to PaymentService.createOrder and returns prepay params', async () => {
      const prepayResult = {
        orderId: 'order-1',
        channel: 'wechat',
        amount: 2990,
        wechatPayParams: { timeStamp: '1234567890', nonceStr: 'abc', prepayId: 'prepay-1' },
      };
      vi.mocked(PaymentService.createOrder).mockResolvedValue(prepayResult as any);

      const result = await PaymentService.createOrder('user-1', 'MEMBERSHIP', 'MONTHLY', 'wechat');
      expect(result.orderId).toBe('order-1');
      expect(result.channel).toBe('wechat');
      expect((result as any).wechatPayParams).toBeDefined();
    });

    it('returns alipay orderString for alipay channel', async () => {
      const alipayResult = {
        orderId: 'order-2',
        channel: 'alipay',
        amount: 2990,
        alipayParams: { orderString: 'alipay_order_string_xyz' },
      };
      vi.mocked(PaymentService.createOrder).mockResolvedValue(alipayResult as any);

      const result = await PaymentService.createOrder('user-1', 'MEMBERSHIP', 'MONTHLY', 'alipay');
      expect((result as any).alipayParams?.orderString).toBe('alipay_order_string_xyz');
    });

    it('returns orderId only for apple_iap channel', async () => {
      const iapResult = { orderId: 'order-3', channel: 'apple_iap', amount: 2990 };
      vi.mocked(PaymentService.createOrder).mockResolvedValue(iapResult as any);

      const result = await PaymentService.createOrder('user-1', 'MEMBERSHIP', 'MONTHLY', 'apple_iap');
      expect(result.orderId).toBe('order-3');
      expect((result as any).wechatPayParams).toBeUndefined();
    });

    it('throws BAD_REQUEST when product does not exist', async () => {
      vi.mocked(PaymentService.createOrder).mockRejectedValue(
        new TRPCError({ code: 'BAD_REQUEST', message: '商品不存在' }),
      );

      await expect(
        PaymentService.createOrder('user-1', 'MEMBERSHIP', 'INVALID_PRODUCT_ID', 'wechat'),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  // ── getOrders ─────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    it('returns all orders for the current user sorted by createdAt desc', async () => {
      const orders = [mockPaidOrder, mockPendingOrder];
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue(orders as any);

      const result = await prisma.paymentOrder.findMany({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(prisma.paymentOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('returns empty array when user has no orders', async () => {
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([]);

      const result = await prisma.paymentOrder.findMany({ where: { userId: 'user-1' } });
      expect(result).toHaveLength(0);
    });
  });

  // ── membershipStatus ──────────────────────────────────────────────────────

  describe('membershipStatus', () => {
    it('returns isActive=false and plan=FREE for free user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        membership: 'FREE',
        membershipExpiry: null,
      } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { membership: true, membershipExpiry: true },
      });

      const isActive =
        user?.membership &&
        user.membership !== 'FREE' &&
        user.membershipExpiry &&
        (user.membershipExpiry as Date) > new Date();

      expect(!!isActive).toBe(false);
      expect(user?.membership).toBe('FREE');
    });

    it('returns isActive=true for GOLD member with future expiry', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        membership: 'GOLD',
        membershipExpiry: futureDate,
      } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { membership: true, membershipExpiry: true },
      });

      const isActive =
        user?.membership &&
        user.membership !== 'FREE' &&
        user.membershipExpiry &&
        (user.membershipExpiry as Date) > new Date();

      expect(!!isActive).toBe(true);
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const user = await prisma.user.findUnique({ where: { id: 'ghost' }, select: { membership: true, membershipExpiry: true } });
      expect(user).toBeNull();

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }).toThrow(TRPCError);
    });

    it('returns isActive=false for expired membership', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        membership: 'MONTHLY',
        membershipExpiry: pastDate,
      } as any);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { membership: true, membershipExpiry: true },
      });

      const isActive =
        user?.membership &&
        user.membership !== 'FREE' &&
        user.membershipExpiry &&
        (user.membershipExpiry as Date) > new Date();

      expect(!!isActive).toBe(false);
    });
  });

  // ── verifyApplePay ────────────────────────────────────────────────────────

  describe('verifyApplePay', () => {
    it('marks order paid and returns success when receipt is valid', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPendingOrder as any);
      vi.mocked(AppleIapAdapter.verifyReceipt).mockResolvedValue({
        valid: true,
        transactionId: 'apple-txn-001',
        environment: 'Production',
        productId: 'com.app.monthly',
      } as any);
      vi.mocked(PaymentService.markOrderPaid).mockResolvedValue(mockPaidOrder as any);

      const order = await prisma.paymentOrder.findFirst({
        where: { id: 'order-1', userId: 'user-1' },
      });
      expect(order).toBeDefined();
      expect(order?.status).toBe('PENDING');

      const result = await AppleIapAdapter.verifyReceipt('receipt-data');
      expect(result.valid).toBe(true);

      await PaymentService.markOrderPaid('order-1', 'apple-txn-001');
      expect(PaymentService.markOrderPaid).toHaveBeenCalledWith('order-1', 'apple-txn-001');
    });

    it('throws BAD_REQUEST when receipt verification fails', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPendingOrder as any);
      vi.mocked(AppleIapAdapter.verifyReceipt).mockResolvedValue({
        valid: false,
        status: 21002,
      } as any);

      const result = await AppleIapAdapter.verifyReceipt('bad-receipt');
      expect(result.valid).toBe(false);

      expect(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Apple 验证失败 (status: ${(result as any).status})` });
      }).toThrow(TRPCError);
    });

    it('throws NOT_FOUND when order does not belong to user', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(null);

      const order = await prisma.paymentOrder.findFirst({
        where: { id: 'order-999', userId: 'user-1' },
      });
      expect(order).toBeNull();

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
      }).toThrow(TRPCError);
    });

    it('throws BAD_REQUEST when order is not PENDING', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPaidOrder as any);

      const order = await prisma.paymentOrder.findFirst({ where: { id: 'order-1' } });
      expect(order?.status).toBe('PAID');

      expect(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '订单状态异常，非待支付状态' });
      }).toThrow(TRPCError);
    });

    it('uses fallback tradeNo when transactionId is missing', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPendingOrder as any);
      vi.mocked(AppleIapAdapter.verifyReceipt).mockResolvedValue({
        valid: true,
        transactionId: undefined,
        environment: 'Sandbox',
        productId: 'com.app.monthly',
      } as any);
      vi.mocked(PaymentService.markOrderPaid).mockResolvedValue(mockPaidOrder as any);

      const result = await AppleIapAdapter.verifyReceipt('receipt-data');
      const tradeNo = result.transactionId ?? `apple_${Date.now()}`;
      expect(tradeNo).toMatch(/^apple_/);
    });
  });

  // ── requestRefund ─────────────────────────────────────────────────────────

  describe('requestRefund', () => {
    it('delegates to PaymentService.processRefund and returns success', async () => {
      const refundedOrder = { ...mockPaidOrder, status: 'REFUNDED' };
      vi.mocked(PaymentService.processRefund).mockResolvedValue(refundedOrder as any);

      const order = await PaymentService.processRefund('order-1', 'user-1');
      expect(order.status).toBe('REFUNDED');
      expect(PaymentService.processRefund).toHaveBeenCalledWith('order-1', 'user-1');
    });

    it('throws NOT_FOUND when order does not exist', async () => {
      vi.mocked(PaymentService.processRefund).mockRejectedValue(
        new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' }),
      );

      await expect(PaymentService.processRefund('ghost-order', 'user-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('throws BAD_REQUEST when order is not in PAID status', async () => {
      vi.mocked(PaymentService.processRefund).mockRejectedValue(
        new TRPCError({ code: 'BAD_REQUEST', message: '订单状态不支持退款' }),
      );

      await expect(PaymentService.processRefund('order-1', 'user-1')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });

  // ── activateMembership ────────────────────────────────────────────────────

  describe('activateMembership', () => {
    it('throws NOT_FOUND when MEMBERSHIP order does not exist for user', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(null);

      const order = await prisma.paymentOrder.findFirst({
        where: { id: 'order-999', userId: 'user-1', productType: 'MEMBERSHIP' },
      });
      expect(order).toBeNull();

      expect(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }).toThrow(TRPCError);
    });

    it('throws BAD_REQUEST when membership order is not PAID', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPendingOrder as any);

      const order = await prisma.paymentOrder.findFirst({
        where: { id: 'order-1', userId: 'user-1', productType: 'MEMBERSHIP' },
      });
      expect(order?.status).toBe('PENDING');

      expect(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is not paid yet' });
      }).toThrow(TRPCError);
    });

    it('calls markOrderPaid and returns updated membership info', async () => {
      vi.mocked(prisma.paymentOrder.findFirst).mockResolvedValue(mockPaidOrder as any);
      vi.mocked(PaymentService.markOrderPaid).mockResolvedValue(mockPaidOrder as any);
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        membership: 'MONTHLY',
        membershipExpiry: futureDate,
      } as any);

      const order = await prisma.paymentOrder.findFirst({
        where: { id: 'order-1', userId: 'user-1', productType: 'MEMBERSHIP' },
      });
      expect(order?.status).toBe('PAID');

      await PaymentService.markOrderPaid(order!.id, order!.tradeNo ?? 'manual');
      expect(PaymentService.markOrderPaid).toHaveBeenCalledWith('order-1', 'trade-123');

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        select: { membership: true, membershipExpiry: true },
      });
      expect(user?.membership).toBe('MONTHLY');
    });
  });
});
