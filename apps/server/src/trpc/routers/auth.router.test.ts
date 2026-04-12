import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'u1' }),
    },
  },
}));

// Mock sms adapter if it exists
vi.mock('../../adapters/sms.adapter', () => ({
  sms: { sendVerificationCode: vi.fn().mockResolvedValue(undefined) },
}));

describe('auth router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./auth.router');
    expect(mod.authRouter).toBeDefined();
  });
});
