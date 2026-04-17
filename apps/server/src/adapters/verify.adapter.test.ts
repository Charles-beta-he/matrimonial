import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('verify adapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { ALIYUN_VERIFY_APP_CODE: undefined },
      isConfigured: () => false,
    }));
  });

  it('verifyIdCard passes with valid name and 18-char id', async () => {
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyIdCard('张三', '110101199001011234');
    expect(result.passed).toBe(true);
  });

  it('verifyIdCard fails when name is too short', async () => {
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyIdCard('张', '110101199001011234');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });

  it('verifyIdCard fails when idCard is not 18 chars', async () => {
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyIdCard('张三', '123456');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });

  it('verifyFace always passes in mock', async () => {
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyFace('https://example.com/face.jpg', '110101199001011234');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.95);
  });
});

describe('verify adapter (aliyun — configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { ALIYUN_VERIFY_APP_CODE: 'app_code_123' },
      isConfigured: (s: string) => s === 'verify',
    }));
  });

  it('verifyIdCard returns passed=true when API returns result=1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ data: { result: '1' } }),
      }),
    );
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyIdCard('张三', '110101199001011234');
    expect(result.passed).toBe(true);
    vi.unstubAllGlobals();
  });

  it('verifyIdCard returns passed=false and reason=api_error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const { verify } = await import('./verify.adapter');
    const result = await verify.verifyIdCard('李四', '110101199001011234');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('api_error');
    vi.unstubAllGlobals();
  });
});
