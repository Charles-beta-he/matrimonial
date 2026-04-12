import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/env', () => ({
  env: { NODE_ENV: 'test' },
  isConfigured: () => false,
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('audit adapter (mock)', () => {
  it('auditText approves clean text', async () => {
    const { audit } = await import('./audit.adapter');
    const res = await audit.auditText('你好，很高兴认识你');
    expect(res.status).toBe('APPROVED');
    expect(res.reasons).toEqual([]);
  });

  it('auditText rejects text with contact pattern (wx123)', async () => {
    const { audit } = await import('./audit.adapter');
    const res = await audit.auditText('微信号 wx123');
    // contains digit-letter contact pattern => REJECTED
    expect(res.status).toBe('REJECTED');
    expect(res.reasons.some((r) => r.startsWith('sensitive:'))).toBe(true);
    expect(res.reasons).toContain('contact_pattern');
  });

  it('auditText rejects text with phone-number-like digits', async () => {
    const { audit } = await import('./audit.adapter');
    const res = await audit.auditText('加我 12345678');
    expect(res.status).toBe('REJECTED');
    expect(res.reasons).toContain('contact_pattern');
  });

  it('auditText flags sensitive word only as REVIEW', async () => {
    const { audit } = await import('./audit.adapter');
    // '转账' is sensitive but no contact pattern
    const res = await audit.auditText('请勿转账');
    expect(res.status).toBe('REVIEW');
    expect(res.reasons.some((r) => r.startsWith('sensitive:'))).toBe(true);
  });

  it('auditImage approves valid http URL', async () => {
    const { audit } = await import('./audit.adapter');
    const res = await audit.auditImage('https://example.com/ok.jpg');
    expect(res.status).toBe('APPROVED');
  });

  it('auditImage rejects invalid URL', async () => {
    const { audit } = await import('./audit.adapter');
    const res = await audit.auditImage('invalid-url');
    expect(res.status).toBe('REJECTED');
    expect(res.reasons).toContain('invalid_url');
  });
});
