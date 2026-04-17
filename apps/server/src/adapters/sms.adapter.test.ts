import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('sms adapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        ALIYUN_SMS_ACCESS_KEY_ID: undefined,
        ALIYUN_SMS_ACCESS_KEY_SECRET: undefined,
        ALIYUN_SMS_TEMPLATE_CODE: undefined,
      },
      isConfigured: () => false,
    }));
  });

  it('sendVerificationCode resolves without error', async () => {
    const { sms } = await import('./sms.adapter');
    await expect(sms.sendVerificationCode('13800138000', '123456')).resolves.toBeUndefined();
  });

  it('sendMessage resolves without error', async () => {
    const { sms } = await import('./sms.adapter');
    await expect(sms.sendMessage('13800138000', '欢迎注册')).resolves.toBeUndefined();
  });
});

describe('sms adapter (aliyun — configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: {
        ALIYUN_SMS_ACCESS_KEY_ID: 'key_id',
        ALIYUN_SMS_ACCESS_KEY_SECRET: 'key_secret',
        ALIYUN_SMS_TEMPLATE_CODE: 'SMS_001',
        ALIYUN_SMS_SIGN_NAME: '婚恋',
      },
      isConfigured: (s: string) => s === 'sms',
    }));
  });

  it('sendVerificationCode resolves without error (stub adapter)', async () => {
    const { sms } = await import('./sms.adapter');
    await expect(sms.sendVerificationCode('13900139000', '654321')).resolves.toBeUndefined();
  });

  it('sendMessage resolves without error (stub adapter)', async () => {
    const { sms } = await import('./sms.adapter');
    await expect(sms.sendMessage('13900139000', '系统通知')).resolves.toBeUndefined();
  });
});
