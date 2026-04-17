import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('AlipayAdapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        ALIPAY_APP_ID: undefined,
        ALIPAY_PRIVATE_KEY: undefined,
        ALIPAY_PUBLIC_KEY: undefined,
        ALIPAY_NOTIFY_URL: undefined,
      },
      isConfigured: () => false,
    }));
  });

  it('createPrepay returns mock order string when not configured', async () => {
    const { AlipayAdapter } = await import('./alipay.adapter');
    const result = await AlipayAdapter.createPrepay({
      orderId: 'order_123',
      amount: 9900,
      subject: 'VIP会员',
      body: '一个月VIP',
    });
    expect(result.orderString).toContain('mock_alipay_order_order_123');
    expect(result.orderString).toContain('amount=9900');
  });

  it('verifyCallback returns true when not configured', async () => {
    const { AlipayAdapter } = await import('./alipay.adapter');
    const result = AlipayAdapter.verifyCallback({ sign: 'abc', out_trade_no: 'order_1' });
    expect(result).toBe(true);
  });

  it('createPrepay throws when configured but private key is invalid', async () => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        ALIPAY_APP_ID: '2021001',
        ALIPAY_PRIVATE_KEY: 'not_a_real_key',
        ALIPAY_PUBLIC_KEY: 'not_a_real_key',
        ALIPAY_NOTIFY_URL: 'https://example.com/notify',
      },
      isConfigured: () => true,
    }));
    const { AlipayAdapter } = await import('./alipay.adapter');
    await expect(
      AlipayAdapter.createPrepay({
        orderId: 'order_456',
        amount: 4900,
        subject: '月卡',
        body: '月卡描述',
      }),
    ).rejects.toThrow('Alipay 签名失败');
  });
});
