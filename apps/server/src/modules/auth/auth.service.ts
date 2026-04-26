import * as jose from 'jose';
import { prisma } from '../../lib/prisma';
import { env } from '../../lib/env';
import { sms } from '../../adapters/sms.adapter';
import { getRedis } from '../../lib/redis';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds
const VERIFY_CODE_TTL_SECONDS = 300; // 5 minutes

// Fallback in-memory verification code store (used when Redis is unavailable)
const verificationCodesFallback = new Map<string, { code: string; expiresAt: number }>();

// Bypass list: specific phones always accept a fixed code regardless of NODE_ENV.
// Used for the seeded default ADMIN account so operators can log into the
// admin console before a real SMS gateway is wired up.
const BYPASS_PHONES: Record<string, string> = {
  '13800000001': '123456',
};

export const AuthService = {
  /** Generate a 6-digit verification code. In dev mode, always returns '123456' */
  async sendVerificationCode(phone: string): Promise<{ success: boolean }> {
    if (BYPASS_PHONES[phone]) {
      // No SMS dispatch, no store write — verifyCode short-circuits below.
      return { success: true };
    }

    const code = env.NODE_ENV === 'production'
      ? String(Math.floor(100000 + Math.random() * 900000))
      : '123456';

    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`verify:code:${phone}`, code, 'EX', VERIFY_CODE_TTL_SECONDS);
      } catch {
        console.warn('[auth] Redis set verify code failed, falling back to in-memory');
        verificationCodesFallback.set(phone, {
          code,
          expiresAt: Date.now() + VERIFY_CODE_TTL_SECONDS * 1000,
        });
      }
    } else {
      console.warn('[auth] Redis unavailable, storing verify code in-memory');
      verificationCodesFallback.set(phone, {
        code,
        expiresAt: Date.now() + VERIFY_CODE_TTL_SECONDS * 1000,
      });
    }

    await sms.sendVerificationCode(phone, code);

    return { success: true };
  },

  /** Verify the code. Returns true if valid */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const bypassCode = BYPASS_PHONES[phone];
    if (bypassCode) return code === bypassCode;

    const redis = getRedis();
    if (redis) {
      try {
        const stored = await redis.get(`verify:code:${phone}`);
        if (!stored) return false;
        if (stored !== code) return false;
        await redis.del(`verify:code:${phone}`);
        return true;
      } catch {
        console.warn('[auth] Redis get verify code failed, falling back to in-memory');
      }
    }

    // Fallback: in-memory
    const stored = verificationCodesFallback.get(phone);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      verificationCodesFallback.delete(phone);
      return false;
    }
    if (stored.code !== code) return false;
    verificationCodesFallback.delete(phone);
    return true;
  },

  /** Sign an access token */
  async signAccessToken(userId: string, role: string = 'USER'): Promise<string> {
    return new jose.SignJWT({ sub: userId, role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(JWT_SECRET);
  },

  /** Sign a refresh token (includes jti for revocation support) */
  async signRefreshToken(userId: string): Promise<string> {
    const jti = crypto.randomUUID();
    return new jose.SignJWT({ sub: userId, type: 'refresh', jti })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_TTL)
      .sign(JWT_SECRET);
  },

  /** Verify and decode a token. Returns payload or null */
  async verifyToken(token: string): Promise<{ sub: string; role?: string } | null> {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      return { sub: payload.sub as string, role: (payload.role as string) ?? 'USER' };
    } catch {
      return null;
    }
  },

  /** Decode a refresh token without full verification (for blacklist/revoke use) */
  async decodeRefreshToken(token: string): Promise<{ sub: string; jti?: string; exp?: number } | null> {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      if ((payload as any).type !== 'refresh') return null;
      return {
        sub: payload.sub as string,
        jti: (payload as any).jti as string | undefined,
        exp: payload.exp,
      };
    } catch {
      return null;
    }
  },

  /** Check if a refresh token's jti is blacklisted */
  async isRefreshTokenRevoked(jti: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
      console.warn('[auth] Redis unavailable, skipping blacklist check');
      return false;
    }
    try {
      const val = await redis.get(`refresh:revoked:${jti}`);
      return val !== null;
    } catch {
      console.warn('[auth] Redis blacklist check failed, allowing token');
      return false;
    }
  },

  /** Add a refresh token jti to the blacklist */
  async revokeRefreshToken(jti: string, tokenExp?: number): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      console.warn('[auth] Redis unavailable, logout blacklist skipped (no-op)');
      return;
    }
    const remainingTtl = tokenExp
      ? Math.max(1, tokenExp - Math.floor(Date.now() / 1000))
      : REFRESH_TOKEN_TTL_SECONDS;
    try {
      await redis.set(`refresh:revoked:${jti}`, '1', 'EX', remainingTtl);
    } catch {
      console.warn('[auth] Redis revoke failed');
    }
  },

  /** Login or register by phone. Returns tokens + user + isNewUser flag */
  async loginOrRegister(phone: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
    isNewUser: boolean;
  }> {
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      // Auto-create user on first login
      user = await prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
          gender: 'MALE', // Will be updated in registration flow
          birthday: new Date('2000-01-01'),
          city: '未设置',
        },
      });
      isNewUser = true;
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date(), isOnline: true },
    });

    const accessToken = await this.signAccessToken(user.id, user.role);
    const refreshToken = await this.signRefreshToken(user.id);

    return { accessToken, refreshToken, user, isNewUser };
  },

  /** Refresh access token using refresh token */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const decoded = await this.decodeRefreshToken(refreshToken);
    if (!decoded) return null;

    // Check blacklist
    if (decoded.jti) {
      const revoked = await this.isRefreshTokenRevoked(decoded.jti);
      if (revoked) return null;
    }

    // Get full payload for role
    const payload = await this.verifyToken(refreshToken);
    if (!payload) return null;

    const newAccessToken = await this.signAccessToken(payload.sub, payload.role);
    const newRefreshToken = await this.signRefreshToken(payload.sub);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },
};
