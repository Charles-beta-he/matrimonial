import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';

/** Admin-only procedure — checks ctx.user.role === 'ADMIN' */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /** List users with pagination and optional filters */
  users: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        gender: z.enum(['MALE', 'FEMALE']).optional(),
        city: z.string().optional(),
        verificationLevel: z.enum(['L1', 'L2', 'L3', 'L4']).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = {};
      if (input.gender) where.gender = input.gender;
      if (input.city) where.city = input.city;
      if (input.verificationLevel)
        where.verificationLevel = input.verificationLevel;
      if (input.search) {
        where.OR = [
          { nickname: { contains: input.search, mode: 'insensitive' } },
          { phone: { contains: input.search } },
        ];
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          include: {
            photos: { where: { isAvatar: true }, take: 1 },
            _count: { select: { sentLikes: true, receivedLikes: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /** List pending reports */
  pendingReports: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.report.findMany({
      where: { status: { in: ['PENDING', 'REVIEWING'] } },
      include: {
        reporter: { select: { id: true, nickname: true } },
        reported: { select: { id: true, nickname: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }),

  /** Resolve or dismiss a report */
  resolveReport: adminProcedure
    .input(
      z.object({
        reportId: z.string(),
        action: z.enum(['RESOLVED', 'DISMISSED']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const report = await ctx.prisma.report.findUnique({
        where: { id: input.reportId },
      });
      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        });
      }

      return ctx.prisma.report.update({
        where: { id: input.reportId },
        data: {
          status: input.action,
          handledBy: ctx.user.id,
          handledAt: new Date(),
        },
      });
    }),

  /** List photos pending audit */
  pendingPhotos: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.photo.findMany({
      where: { auditStatus: 'PENDING' },
      include: {
        user: { select: { id: true, nickname: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }),

  /** Approve a photo */
  approvePhoto: adminProcedure
    .input(z.object({ photoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const photo = await ctx.prisma.photo.findUnique({
        where: { id: input.photoId },
      });
      if (!photo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Photo not found',
        });
      }

      return ctx.prisma.photo.update({
        where: { id: input.photoId },
        data: { auditStatus: 'APPROVED' },
      });
    }),

  /** Reject a photo */
  rejectPhoto: adminProcedure
    .input(z.object({ photoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const photo = await ctx.prisma.photo.findUnique({
        where: { id: input.photoId },
      });
      if (!photo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Photo not found',
        });
      }

      return ctx.prisma.photo.update({
        where: { id: input.photoId },
        data: { auditStatus: 'REJECTED' },
      });
    }),

  /** Analytics overview — top events, DAU, sessions, funnels */
  analyticsOverview: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(7),
      }),
    )
    .query(async ({ input, ctx }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      try {
        const [topEvents, dau, sessionCount, registrationFunnel, matchRate] = await Promise.all([
          // Top events by count
          ctx.prisma.$queryRaw`
            SELECT event, COUNT(*)::int as count
            FROM analytics_events
            WHERE created_at >= ${since}
            GROUP BY event
            ORDER BY count DESC
            LIMIT 20
          ` as Promise<Array<{ event: string; count: number }>>,

          // Daily active users (distinct user_ids per day)
          ctx.prisma.$queryRaw`
            SELECT DATE(created_at) as date, COUNT(DISTINCT user_id)::int as users
            FROM analytics_events
            WHERE created_at >= ${since} AND user_id IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY date DESC
          ` as Promise<Array<{ date: string; users: number }>>,

          // Total sessions
          ctx.prisma.$queryRaw`
            SELECT COUNT(DISTINCT session_id)::int as count
            FROM analytics_events
            WHERE created_at >= ${since}
          ` as Promise<Array<{ count: number }>>,

          // Registration funnel (steps 1-5 completion counts)
          ctx.prisma.$queryRaw`
            SELECT (props->>'step')::int as step, COUNT(*)::int as count
            FROM analytics_events
            WHERE event = 'register_step_complete' AND created_at >= ${since}
            GROUP BY (props->>'step')::int
            ORDER BY step
          ` as Promise<Array<{ step: number; count: number }>>,

          // Match rate (matches / likes)
          ctx.prisma.$queryRaw`
            SELECT
              COUNT(*) FILTER (WHERE event = 'card_like')::int as likes,
              COUNT(*) FILTER (WHERE event = 'match_success')::int as matches
            FROM analytics_events
            WHERE event IN ('card_like', 'match_success') AND created_at >= ${since}
          ` as Promise<Array<{ likes: number; matches: number }>>,
        ]);

        return {
          topEvents,
          dau,
          sessionCount: sessionCount[0]?.count ?? 0,
          registrationFunnel,
          matchRate: {
            likes: matchRate[0]?.likes ?? 0,
            matches: matchRate[0]?.matches ?? 0,
            rate: matchRate[0]?.likes
              ? ((matchRate[0].matches / matchRate[0].likes) * 100).toFixed(1) + '%'
              : '0%',
          },
        };
      } catch {
        // analytics_events table may not exist yet
        return {
          topEvents: [],
          dau: [],
          sessionCount: 0,
          registrationFunnel: [],
          matchRate: { likes: 0, matches: 0, rate: '0%' },
        };
      }
    }),

  /** Dashboard statistics */
  stats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      todaySignups,
      activeUsersWeek,
      totalMatches,
      pendingReports,
      pendingPhotos,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      ctx.prisma.user.count({
        where: { lastActiveAt: { gte: weekAgo } },
      }),
      ctx.prisma.like.count({ where: { isMatched: true } }),
      ctx.prisma.report.count({ where: { status: 'PENDING' } }),
      ctx.prisma.photo.count({ where: { auditStatus: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      todaySignups,
      activeUsersWeek,
      totalMatches,
      pendingReports,
      pendingPhotos,
    };
  }),
});
