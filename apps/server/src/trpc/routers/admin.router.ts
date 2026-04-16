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

  /** Ban a user */
  banUser: adminProcedure
    .input(z.object({ userId: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          status: 'BANNED',
          bannedAt: new Date(),
          banReason: input.reason,
        },
      });
    }),

  /** Unban a user */
  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { status: 'ACTIVE', bannedAt: null, banReason: null },
      });
    }),

  /** Pending text audit items */
  pendingTextAudits: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.textAuditItem.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }),

  /** Approve a text audit item */
  approveText: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.textAuditItem.update({
        where: { id: input.id },
        data: {
          status: 'APPROVED',
          handledBy: ctx.user.id,
          handledAt: new Date(),
        },
      });
    }),

  /** Reject a text audit item */
  rejectText: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.textAuditItem.update({
        where: { id: input.id },
        data: {
          status: 'REJECTED',
          handledBy: ctx.user.id,
          handledAt: new Date(),
        },
      });
    }),

  /** Matchmaker list */
  matchmakers: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const [items, total] = await Promise.all([
        ctx.prisma.matchmaker.findMany({
          include: {
            user: { select: { id: true, nickname: true, city: true } },
          },
          orderBy: { totalMatches: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.matchmaker.count(),
      ]);
      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /** Matchmaker aggregated stats */
  matchmakerStats: adminProcedure.query(async ({ ctx }) => {
    const [activeCount, agg] = await Promise.all([
      ctx.prisma.matchmaker.count({ where: { isOnline: true } }),
      ctx.prisma.matchmaker.aggregate({
        _sum: { totalMatches: true },
        _avg: { successRate: true, rating: true },
      }),
    ]);
    return {
      activeCount,
      monthlyMatches: agg._sum.totalMatches ?? 0,
      avgSuccessRate: agg._avg.successRate ?? 0,
      avgRating: agg._avg.rating ?? 0,
    };
  }),

  /** Create activity (admin) */
  createActivity: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: z.string().min(1),
        startTime: z.coerce.date(),
        location: z.string().min(1),
        description: z.string().default(''),
        coverUrl: z.string().default(''),
        maxParticipants: z.number().int().min(2),
        fee: z.number().min(0).default(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const half = Math.floor(input.maxParticipants / 2);
      return ctx.prisma.activity.create({
        data: {
          title: input.title,
          description: input.description,
          coverUrl: input.coverUrl,
          category: input.category,
          location: input.location,
          startTime: input.startTime,
          maxMale: half,
          maxFemale: input.maxParticipants - half,
          fee: input.fee,
        },
      });
    }),

  /** Update activity (admin) */
  updateActivity: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        category: z.string().optional(),
        startTime: z.coerce.date().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        coverUrl: z.string().optional(),
        fee: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      return ctx.prisma.activity.update({ where: { id }, data: rest });
    }),

  /** Cancel activity */
  cancelActivity: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.activity.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    }),

  /** List push campaigns */
  listPushCampaigns: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const [items, total] = await Promise.all([
        ctx.prisma.pushCampaign.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.pushCampaign.count(),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** Create push campaign */
  createPushCampaign: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        audience: z.enum([
          'ALL',
          'ACTIVE',
          'INACTIVE',
          'MALE',
          'FEMALE',
          'VERIFIED',
          'PREMIUM',
        ]),
        scheduleAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.pushCampaign.create({
        data: {
          title: input.title,
          body: input.body,
          audience: input.audience,
          scheduleAt: input.scheduleAt ?? null,
          createdBy: ctx.user.id,
        },
      });
    }),

  /** Send a push campaign (computes audience size; real FCM/APNs dispatch TODO) */
  sendPushCampaign: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const campaign = await ctx.prisma.pushCampaign.findUnique({
        where: { id: input.id },
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const where: Record<string, unknown> = { status: 'ACTIVE' };
      switch (campaign.audience) {
        case 'ALL':
          break;
        case 'ACTIVE':
          where.lastActiveAt = { gte: weekAgo };
          break;
        case 'INACTIVE':
          where.lastActiveAt = { lt: thirtyDaysAgo };
          break;
        case 'MALE':
          where.gender = 'MALE';
          break;
        case 'FEMALE':
          where.gender = 'FEMALE';
          break;
        case 'VERIFIED':
          where.verificationLevel = { in: ['L3', 'L4'] };
          break;
        case 'PREMIUM':
          where.membership = { in: ['MONTHLY', 'QUARTERLY', 'YEARLY'] };
          break;
      }
      const recipientCount = await ctx.prisma.user.count({ where });

      // TODO: integrate real FCM/APNs dispatcher; for now we only mark delivered count.
      return ctx.prisma.pushCampaign.update({
        where: { id: input.id },
        data: {
          sentAt: new Date(),
          delivered: recipientCount,
          opened: 0,
        },
      });
    }),

  /** Recent admin-facing activity stream */
  recentActivity: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      const take = input.limit;
      const [newUsers, bannedUsers, handledPhotos, handledReports] =
        await Promise.all([
          ctx.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            select: { id: true, nickname: true, createdAt: true },
          }),
          ctx.prisma.user.findMany({
            where: { status: 'BANNED', bannedAt: { not: null } },
            orderBy: { bannedAt: 'desc' },
            take,
            select: { id: true, nickname: true, bannedAt: true, banReason: true },
          }),
          ctx.prisma.photo.findMany({
            where: { auditStatus: { in: ['APPROVED', 'REJECTED'] } },
            orderBy: { createdAt: 'desc' },
            take,
            select: { id: true, userId: true, auditStatus: true, createdAt: true },
          }),
          ctx.prisma.report.findMany({
            where: { handledAt: { not: null } },
            orderBy: { handledAt: 'desc' },
            take,
            select: { id: true, status: true, handledAt: true, reportedId: true },
          }),
        ]);

      type Entry = { time: Date; action: string; detail: string };
      const entries: Entry[] = [
        ...newUsers.map<Entry>((u) => ({
          time: u.createdAt,
          action: '新用户注册',
          detail: `用户 ${u.nickname} (${u.id.slice(-6)}) 完成注册`,
        })),
        ...bannedUsers
          .filter((u): u is typeof u & { bannedAt: Date } => !!u.bannedAt)
          .map<Entry>((u) => ({
            time: u.bannedAt,
            action: '用户封禁',
            detail: `用户 ${u.nickname} 被封禁 — ${u.banReason ?? '违规'}`,
          })),
        ...handledPhotos.map<Entry>((p) => ({
          time: p.createdAt,
          action: '照片审核',
          detail: `照片 ${p.id.slice(-6)} ${
            p.auditStatus === 'APPROVED' ? '已通过' : '已拒绝'
          }`,
        })),
        ...handledReports
          .filter((r): r is typeof r & { handledAt: Date } => !!r.handledAt)
          .map<Entry>((r) => ({
            time: r.handledAt,
            action: '举报处理',
            detail: `举报 ${r.id.slice(-6)} ${
              r.status === 'RESOLVED' ? '已处理' : '已驳回'
            }`,
          })),
      ];

      return entries
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, take)
        .map((e) => ({
          time: e.time.toISOString(),
          action: e.action,
          detail: e.detail,
        }));
    }),

  /** Gender ratio statistics */
  genderStats: adminProcedure.query(async ({ ctx }) => {
    const [male, female] = await Promise.all([
      ctx.prisma.user.count({ where: { gender: 'MALE' } }),
      ctx.prisma.user.count({ where: { gender: 'FEMALE' } }),
    ]);
    const total = male + female;
    return {
      male,
      female,
      total,
      malePercent: total > 0 ? ((male / total) * 100).toFixed(1) : '0',
      femalePercent: total > 0 ? ((female / total) * 100).toFixed(1) : '0',
      ratio: female > 0 ? (male / female).toFixed(2) : 'N/A',
    };
  }),

  /** Revenue analytics */
  revenueStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalRevenue, monthRevenue, paidOrders, paidUsers, totalUsers, membershipBreakdown] = await Promise.all([
      ctx.prisma.paymentOrder.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      ctx.prisma.paymentOrder.aggregate({
        where: { status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      }),
      ctx.prisma.paymentOrder.count({ where: { status: 'PAID' } }),
      ctx.prisma.paymentOrder.groupBy({
        by: ['userId'],
        where: { status: 'PAID' },
      }),
      ctx.prisma.user.count(),
      ctx.prisma.user.groupBy({
        by: ['membership'],
        _count: true,
      }),
    ]);

    const uniquePayers = paidUsers.length;
    const arpu = totalUsers > 0 ? Number(totalRevenue._sum.amount ?? 0) / totalUsers : 0;
    const arppu = uniquePayers > 0 ? Number(totalRevenue._sum.amount ?? 0) / uniquePayers : 0;

    return {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      monthRevenue: Number(monthRevenue._sum.amount ?? 0),
      monthOrders: monthRevenue._count ?? 0,
      totalPaidOrders: paidOrders,
      uniquePayers,
      arpu: arpu.toFixed(2),
      arppu: arppu.toFixed(2),
      payRate: totalUsers > 0 ? ((uniquePayers / totalUsers) * 100).toFixed(1) : '0',
      membershipBreakdown: membershipBreakdown.map(m => ({
        plan: m.membership ?? 'FREE',
        count: m._count,
      })),
    };
  }),

  /** Message reply rate statistics */
  messageStats: adminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalMessages, conversations, activeConversations] = await Promise.all([
      ctx.prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ctx.prisma.conversation.count(),
      ctx.prisma.message.groupBy({
        by: ['conversationId'],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const repliedConversations = await ctx.prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM (
        SELECT c.id
        FROM "Conversation" c
        JOIN "Message" m ON m."conversationId" = c.id
        WHERE m."createdAt" >= ${sevenDaysAgo}
        GROUP BY c.id
        HAVING COUNT(DISTINCT m."senderId") > 1
      ) sub
    `.then((rows: any) => rows?.[0]?.count ?? 0).catch(() => 0);

    return {
      totalMessages7d: totalMessages,
      totalConversations: conversations,
      activeConversations7d: activeConversations.length,
      repliedConversations7d: repliedConversations,
      replyRate: activeConversations.length > 0
        ? ((repliedConversations / activeConversations.length) * 100).toFixed(1)
        : '0',
    };
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
