import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { verify } from '../../adapters/verify.adapter';

export const verificationRouter = router({
  /** Get current verification status */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        verificationLevel: true,
        realNameVerified: true,
        faceVerified: true,
        eduVerified: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  }),

  /** Submit real-name verification — mock verify, upgrade to L2 */
  submitRealName: protectedProcedure
    .input(
      z.object({
        idCardNumber: z
          .string()
          .regex(/^\d{17}[\dXx]$/, 'ID card number must be 18 digits'),
        realName: z.string().min(2, 'Name must be at least 2 characters'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { realNameVerified: true },
      });
      if (user?.realNameVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Already verified',
        });
      }

      // Call verify adapter (mock in dev, Aliyun in prod)
      const result = await verify.verifyIdCard(input.realName, input.idCardNumber);
      if (!result.passed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `实名认证失败: ${result.reason ?? 'unknown'}`,
        });
      }

      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          realNameVerified: true,
          verificationLevel: 'L2',
        },
        select: {
          verificationLevel: true,
          realNameVerified: true,
          faceVerified: true,
          eduVerified: true,
        },
      });
    }),

  /** Submit face verification — mock verify, upgrade to L3 */
  submitFaceVerify: protectedProcedure
    .input(
      z.object({
        faceImageUrl: z.string().url('Must be a valid image URL'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { realNameVerified: true, faceVerified: true },
      });
      if (!user?.realNameVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must complete real-name verification first (L2)',
        });
      }
      if (user.faceVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Already verified',
        });
      }

      // Call verify adapter (mock in dev, Aliyun in prod)
      const result = await verify.verifyFace(input.faceImageUrl, '');
      if (!result.passed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `人脸认证失败: ${result.reason ?? 'unknown'}`,
        });
      }

      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          faceVerified: true,
          verificationLevel: 'L3',
        },
        select: {
          verificationLevel: true,
          realNameVerified: true,
          faceVerified: true,
          eduVerified: true,
        },
      });
    }),

  /** Submit education verification — mock verify, upgrade to L4 */
  submitEduVerify: protectedProcedure
    .input(
      z.object({
        schoolName: z.string().min(2, 'School name required'),
        degree: z.enum([
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'PHD',
        ]),
        graduationYear: z
          .number()
          .int()
          .min(1950)
          .max(new Date().getFullYear() + 5),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { faceVerified: true, eduVerified: true },
      });
      if (!user?.faceVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must complete face verification first (L3)',
        });
      }
      if (user.eduVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Already verified',
        });
      }

      // Mock education verification — in production, call edu verification API
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          eduVerified: true,
          verificationLevel: 'L4',
          education: input.degree,
        },
        select: {
          verificationLevel: true,
          realNameVerified: true,
          faceVerified: true,
          eduVerified: true,
        },
      });
    }),
});
