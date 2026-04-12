import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma before importing auth service
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'user1', phone: '13800000001', nickname: 'Test' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock sms adapter so tests don't hit real SMS provider
vi.mock('../../adapters/sms.adapter', () => ({
  sms: { sendVerificationCode: vi.fn().mockResolvedValue(undefined) },
}));

// Mock env with deterministic defaults for tests
vi.mock('../../lib/env', () => ({
  env: {
    NODE_ENV: 'development',
    JWT_SECRET: 'test-secret-for-auth-service',
  },
  isConfigured: () => false,
}));

describe('AuthService', () => {
  let AuthService: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('./auth.service');
    AuthService = mod.AuthService;
  });

  describe('sendVerificationCode', () => {
    it('returns success', async () => {
      const result = await AuthService.sendVerificationCode('13800000001');
      expect(result.success).toBe(true);
    });
  });

  describe('verifyCode', () => {
    it('returns true for correct code after sending', async () => {
      await AuthService.sendVerificationCode('13800000001');
      // Dev mode always sends '123456'
      expect(AuthService.verifyCode('13800000001', '123456')).toBe(true);
    });

    it('returns false for wrong code', async () => {
      await AuthService.sendVerificationCode('13800000001');
      expect(AuthService.verifyCode('13800000001', '000000')).toBe(false);
    });

    it('returns false if code not sent', () => {
      expect(AuthService.verifyCode('13899999999', '123456')).toBe(false);
    });

    it('code can only be used once', async () => {
      await AuthService.sendVerificationCode('13800000001');
      AuthService.verifyCode('13800000001', '123456');
      expect(AuthService.verifyCode('13800000001', '123456')).toBe(false);
    });
  });

  describe('signAccessToken + verifyToken', () => {
    it('signs and verifies a token', async () => {
      const token = await AuthService.signAccessToken('user1', 'USER');
      expect(typeof token).toBe('string');

      const payload = await AuthService.verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user1');
      expect(payload?.role).toBe('USER');
    });

    it('rejects invalid token', async () => {
      const payload = await AuthService.verifyToken('invalid.token.here');
      expect(payload).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('returns new token pair for valid refresh token', async () => {
      const refreshToken = await AuthService.signRefreshToken('user1');
      const result = await AuthService.refreshAccessToken(refreshToken);
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBeDefined();
      expect(result?.refreshToken).toBeDefined();
    });

    it('returns null for invalid refresh token', async () => {
      const result = await AuthService.refreshAccessToken('garbage');
      expect(result).toBeNull();
    });
  });
});
