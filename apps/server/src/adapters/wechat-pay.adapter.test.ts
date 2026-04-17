import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('WechatPayAdapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        WECHAT_APP_ID: undefined,
        WECHAT_MCH_ID: undefined,
        WECHAT_API_V3_KEY: undefined,
        WECHAT_PRIVATE_KEY: undefined,
        WECHAT_NOTIFY_URL: undefined,
      },
      isConfigured: () => false,
    }));
  });

  it('createPrepay returns mock prepayId and payParams', async () => {
    const { WechatPayAdapter } = await import('./wechat-pay.adapter');
    const result = await WechatPayAdapter.createPrepay({
      orderId: 'order_001',
      amount: 9900,
      description: 'VIP月卡',
    });
    expect(result.prepayId).toContain('mock_prepay_order_001');
    expect(result.payParams.appId).toBe('mock_appid');
    expect(result.payParams.signType).toBe('RSA');
    expect(result.payParams.package).toContain('prepay_id=');
  });

  it('verifyCallback returns true when not configured', async () => {
    const { WechatPayAdapter } = await import('./wechat-pay.adapter');
    const ok = WechatPayAdapter.verifyCallback({ 'wechatpay-serial': 'abc' }, 'body');
    expect(ok).toBe(true);
  });

  it('decryptCallback parses ciphertext as JSON in mock mode', async () => {
    const { WechatPayAdapter } = await import('./wechat-pay.adapter');
    const payload = { transaction_id: 'txn_001', trade_state: 'SUCCESS' };
    const result = WechatPayAdapter.decryptCallback({
      ciphertext: JSON.stringify(payload),
      nonce: 'nonce',
      associated_data: 'ad',
    });
    expect(result).toEqual(payload);
  });

  it('decryptCallback returns null when ciphertext is not valid JSON in mock mode', async () => {
    const { WechatPayAdapter } = await import('./wechat-pay.adapter');
    const result = WechatPayAdapter.decryptCallback({
      ciphertext: 'not_json',
      nonce: 'nonce',
      associated_data: 'ad',
    });
    expect(result).toBeNull();
  });
});

describe('WechatPayAdapter (configured stub — PRIVATE_KEY missing)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        WECHAT_APP_ID: 'wx_app_001',
        WECHAT_MCH_ID: 'mch_001',
        WECHAT_API_V3_KEY: undefined, // missing private key → configured = false
        WECHAT_PRIVATE_KEY: undefined,
        WECHAT_NOTIFY_URL: 'https://example.com/notify',
      },
      // wechatpay check: !!(WECHAT_APP_ID && WECHAT_MCH_ID && WECHAT_API_V3_KEY)
      isConfigured: () => false,
    }));
  });

  it('createPrepay still returns mock shape when private key is absent', async () => {
    const { WechatPayAdapter } = await import('./wechat-pay.adapter');
    const result = await WechatPayAdapter.createPrepay({
      orderId: 'order_002',
      amount: 4900,
      description: '季卡',
    });
    expect(result.prepayId).toBeTruthy();
    expect(result.payParams.signType).toBe('RSA');
  });
});
