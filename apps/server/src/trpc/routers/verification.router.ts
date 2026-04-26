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

  /** Submit face verification — creates a PENDING review row, does NOT grant L3 immediately */
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

      // Check for an existing pending request to avoid duplicates
      const existing = await ctx.prisma.verificationRequest.findFirst({
        where: { userId: ctx.user.id, level: 'L3', status: 'PENDING' },
      });
      if (existing) {
        return { status: 'PENDING', message: '已提交，1-3 个工作日审核' } as const;
      }

      await ctx.prisma.verificationRequest.create({
        data: {
          userId: ctx.user.id,
          level: 'L3',
          payload: { faceImageUrl: input.faceImageUrl },
        },
      });

      return { status: 'PENDING', message: '已提交，1-3 个工作日审核' } as const;
    }),

  /** Submit education verification — creates a PENDING review row, does NOT grant L4 immediately */
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

      // Check for an existing pending request to avoid duplicates
      const existing = await ctx.prisma.verificationRequest.findFirst({
        where: { userId: ctx.user.id, level: 'L4', status: 'PENDING' },
      });
      if (existing) {
        return { status: 'PENDING', message: '已提交，1-3 个工作日审核' } as const;
      }

      await ctx.prisma.verificationRequest.create({
        data: {
          userId: ctx.user.id,
          level: 'L4',
          payload: { school: input.schoolName, degree: input.degree, year: input.graduationYear },
        },
      });

      return { status: 'PENDING', message: '已提交，1-3 个工作日审核' } as const;
    }),

  /**
   * Approve a pending VerificationRequest.
   * Flips both VerificationRequest.status → APPROVED and the corresponding User flag.
   * TODO: wire this up to the admin UI once it exists.
   */
  approve: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const request = await ctx.prisma.verificationRequest.findUnique({
        where: { id: input.requestId },
      });
      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
      }
      if (request.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request is not pending' });
      }

      const userUpdate =
        request.level === 'L3'
          ? { faceVerified: true, verificationLevel: 'L3' as const }
          : { eduVerified: true, verificationLevel: 'L4' as const };

      await ctx.prisma.$transaction([
        ctx.prisma.verificationRequest.update({
          where: { id: input.requestId },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewerId: ctx.user.id },
        }),
        ctx.prisma.user.update({
          where: { id: request.userId },
          data: userUpdate,
        }),
      ]);

      return { success: true };
    }),
});
