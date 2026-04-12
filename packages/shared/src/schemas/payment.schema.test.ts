import { describe, it, expect } from 'vitest';
import { createOrderSchema, paymentCallbackSchema } from './payment.schema';

describe('createOrderSchema', () => {
  it('accepts valid MEMBERSHIP+wechat', () => {
    const res = createOrderSchema.safeParse({
      productType: 'MEMBERSHIP',
      productId: 'MEMBERSHIP_MONTHLY',
      channel: 'wechat',
    });
    expect(res.success).toBe(true);
  });

  it('accepts SUPER_LIKE+alipay', () => {
    const res = createOrderSchema.safeParse({
      productType: 'SUPER_LIKE',
      productId: 'SUPER_LIKE_5',
      channel: 'alipay',
    });
    expect(res.success).toBe(true);
  });

  it('accepts BOOST+apple_iap', () => {
    const res = createOrderSchema.safeParse({
      productType: 'BOOST',
      productId: 'BOOST_30MIN',
      channel: 'apple_iap',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid productType enum', () => {
    const res = createOrderSchema.safeParse({
      productType: 'INVALID',
      productId: 'X',
      channel: 'wechat',
    });
    expect(res.success).toBe(false);
  });

  it('rejects invalid channel enum', () => {
    const res = createOrderSchema.safeParse({
      productType: 'MEMBERSHIP',
      productId: 'X',
      channel: 'paypal',
    });
    expect(res.success).toBe(false);
  });

  it('rejects empty productId', () => {
    const res = createOrderSchema.safeParse({
      productType: 'MEMBERSHIP',
      productId: '',
      channel: 'wechat',
    });
    expect(res.success).toBe(false);
  });
});

describe('paymentCallbackSchema', () => {
  it('accepts valid success callback', () => {
    const res = paymentCallbackSchema.safeParse({
      orderId: 'o1',
      tradeNo: 't1',
      status: 'success',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const res = paymentCallbackSchema.safeParse({
      orderId: 'o1',
      tradeNo: 't1',
      status: 'pending',
    });
    expect(res.success).toBe(false);
  });
});
