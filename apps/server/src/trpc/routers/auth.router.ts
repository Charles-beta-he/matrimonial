import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from '../base';
import { AuthService } from '../../modules/auth/auth.service';

export const authRouter = router({
  /** Send SMS verification code */
  sendCode: publicProcedure
    .input(z.object({ phone: z.string().min(10).max(20) }))
    .mutation(async ({ input }) => {
      return AuthService.sendVerificationCode(input.phone);
    }),

  /** Verify code and login/register */
  verifyCode: publicProcedure
    .input(z.object({
      phone: z.string().min(10).max(20),
      code: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      const isValid = await AuthService.verifyCode(input.phone, input.code);
      if (!isValid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '验证码错误或已过期' });
      }
      return AuthService.loginOrRegister(input.phone);
    }),

  /** Refresh access token */
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      const result = await AuthService.refreshAccessToken(input.refreshToken);
      if (!result) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token 已过期，请重新登录' });
      }
      return result;
    }),

  /** Logout — mark user offline and revoke refresh token */
  logout: protectedProcedure
    .input(z.object({ refreshToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { isOnline: false },
      });

      if (input?.refreshToken) {
        const decoded = await AuthService.decodeRefreshToken(input.refreshToken);
        if (decoded?.jti) {
          await AuthService.revokeRefreshToken(decoded.jti, decoded.exp);
        }
      }

      return { success: true };
    }),
});
