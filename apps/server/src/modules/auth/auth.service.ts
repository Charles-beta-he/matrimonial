import * as jose from 'jose';
import { prisma } from '../../lib/prisma';
import { env } from '../../lib/env';
import { sms } from '../../adapters/sms.adapter';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

// In-memory verification code store (use Redis in production)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

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

    verificationCodes.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await sms.sendVerificationCode(phone, code);

    return { success: true };
  },

  /** Verify the code. Returns true if valid */
  verifyCode(phone: string, code: string): boolean {
    const bypassCode = BYPASS_PHONES[phone];
    if (bypassCode) return code === bypassCode;

    const stored = verificationCodes.get(phone);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(phone);
      return false;
    }
    if (stored.code !== code) return false;
    verificationCodes.delete(phone);
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

  /** Sign a refresh token */
  async signRefreshToken(userId: string): Promise<string> {
    return new jose.SignJWT({ sub: userId, type: 'refresh' })
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
    const payload = await this.verifyToken(refreshToken);
    if (!payload) return null;

    const newAccessToken = await this.signAccessToken(payload.sub, payload.role);
    const newRefreshToken = await this.signRefreshToken(payload.sub);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },
};
