import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../base';
import { CreditsService } from '../../modules/credits/credits.service';
import { logger } from '../../lib/logger';

const ACHIEVEMENT_DEFS = [
  { type: 'first_match', name: '初次邂逅', description: '获得第一次匹配', icon: '💕' },
  { type: 'profile_complete', name: '真实自我', description: '完善所有资料（照片+标签+问答）', icon: '✨' },
  { type: 'checkin_7', name: '持之以恒', description: '连续签到7天', icon: '🔥' },
  { type: 'checkin_30', name: '铁杆用户', description: '累计签到30天', icon: '👑' },
  { type: 'first_activity', name: '社交达人', description: '参加第一次线下活动', icon: '🎉' },
  { type: 'verified_l3', name: '值得信赖', description: '完成L3真人认证', icon: '🛡️' },
  { type: 'five_matches', name: '万人迷', description: '累计获得5次匹配', icon: '🌟' },
  { type: 'first_message', name: '破冰者', description: '主动发送第一条消息', icon: '💬' },
  { type: 'circle_member', name: '圈子达人', description: '加入第一个兴趣圈', icon: '🎯' },
  { type: 'first_video', name: '面对面', description: '完成第一次视频通话', icon: '📹' },
];

async function checkAndGrantAchievements(prisma: any, userId: string) {
  const [matchCount, checkInCount, signupCount, messageCount, user] = await Promise.all([
    prisma.like.count({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }], isMatched: true },
    }),
    prisma.checkIn.count({ where: { userId } }),
    prisma.activitySignup.count({ where: { userId, status: 'CONFIRMED' } }),
    prisma.message.count({ where: { senderId: userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, tags: true, prompts: true },
    }),
  ]);

  const checks = [
    { type: 'first_match', condition: matchCount >= 1 },
    { type: 'five_matches', condition: matchCount >= 5 },
    { type: 'checkin_7', condition: checkInCount >= 7 },
    { type: 'checkin_30', condition: checkInCount >= 30 },
    { type: 'first_activity', condition: signupCount >= 1 },
    { type: 'first_message', condition: messageCount >= 1 },
    {
      type: 'verified_l3',
      condition: user?.verificationLevel === 'L3' || user?.verificationLevel === 'L4',
    },
    {
      type: 'profile_complete',
      condition:
        (user?.photos?.length ?? 0) >= 2 &&
        (user?.tags?.length ?? 0) >= 3 &&
        (user?.prompts?.length ?? 0) >= 3,
    },
  ];

  for (const check of checks) {
    if (check.condition) {
      const def = ACHIEVEMENT_DEFS.find((d) => d.type === check.type);
      if (def) {
        await prisma.achievement
          .upsert({
            where: { userId_type: { userId, type: check.type } },
            create: { userId, type: check.type, name: def.name, description: def.description },
            update: {},
          })
          .catch((err) => logger.error('achievement upsert failed', { userId, type: check.type, err }));
      }
    }
  }

  // circle_member: check if user has joined any circle
  const circleCount = await prisma.circleMember.count({
    where: { userId },
  }).catch((err) => { logger.warn('circleMember count failed', { userId, err }); return 0; });
  if (circleCount > 0) {
    const def = ACHIEVEMENT_DEFS.find((d) => d.type === 'circle_member');
    if (def) {
      await prisma.achievement
        .upsert({
          where: { userId_type: { userId, type: 'circle_member' } },
          create: { userId, type: 'circle_member', name: def.name, description: def.description },
          update: {},
        })
        .catch((err) => logger.error('achievement upsert failed', { userId, type: 'circle_member', err }));
    }
  }

  // first_video: check if user has completed any video call
  try {
    const videoCount = await prisma.videoRoom.count({
      where: {
        participants: { some: { userId } },
        status: 'ENDED',
      },
    }).catch((err) => { logger.warn('videoRoom count failed', { userId, err }); return 0; });
    if (videoCount > 0) {
      const def = ACHIEVEMENT_DEFS.find((d) => d.type === 'first_video');
      if (def) {
        await prisma.achievement
          .upsert({
            where: { userId_type: { userId, type: 'first_video' } },
            create: { userId, type: 'first_video', name: def.name, description: def.description },
            update: {},
          })
          .catch((err) => logger.error('achievement upsert failed', { userId, type: 'first_video', err }));
      }
    }
  } catch {
    logger.warn('first_video achievement check skipped: VideoRoom model may not exist', { userId });
  }
}

export const checkinRouter = router({
  /** Daily check-in */
  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    // Use CST (UTC+8) for date calculations
    const nowCST = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const today = nowCST.toISOString().slice(0, 10);

    // Check if already checked in today
    const existing = await ctx.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: '今天已经签到过了' });
    }

    // Calculate streak
    const yesterdayCST = new Date(Date.now() + 8 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
    const yesterday = yesterdayCST.toISOString().slice(0, 10);
    const yesterdayCheckin = await ctx.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: yesterday } },
    });
    const streak = yesterdayCheckin ? yesterdayCheckin.streak + 1 : 1;

    // Determine reward based on streak
    let reward = '';
    if (streak >= 7) {
      await CreditsService.grant(userId, 'SUPER_LIKE', 3, 'checkin_7day');
      reward = '连续签到7天，获得3个超级喜欢';
    } else if (streak >= 3) {
      await CreditsService.grant(userId, 'SUPER_LIKE', 2, 'checkin_3day');
      reward = '连续签到3天，获得2个超级喜欢';
    } else {
      await CreditsService.grant(userId, 'SUPER_LIKE', 1, 'checkin_daily');
      reward = '签到成功，获得1个超级喜欢';
    }

    const checkIn = await ctx.prisma.checkIn.create({
      data: { userId, date: today, streak, reward },
    });

    logger.info('user checked in', { userId, streak, reward });

    // Check achievements after check-in
    await checkAndGrantAchievements(ctx.prisma, userId);

    return { checkIn, streak, reward };
  }),

  /** Get check-in history (last 30 days) */
  history: protectedProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const checkins = await ctx.prisma.checkIn.findMany({
      where: { userId: ctx.user.id, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
    });

    // Get today's status (CST UTC+8)
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayCheckin = checkins.find((c: any) => c.date === today);

    return {
      checkedInToday: !!todayCheckin,
      currentStreak: todayCheckin?.streak ?? 0,
      totalCheckIns: checkins.length,
      history: checkins,
    };
  }),

  /** Get all achievements */
  achievements: protectedProcedure.query(async ({ ctx }) => {
    const unlocked = await ctx.prisma.achievement.findMany({
      where: { userId: ctx.user.id },
      orderBy: { unlockedAt: 'desc' },
    });

    // Return all possible achievements with unlock status
    return ACHIEVEMENT_DEFS.map((def) => {
      const found = unlocked.find((a: any) => a.type === def.type);
      return {
        ...def,
        unlocked: !!found,
        unlockedAt: found?.unlockedAt ?? null,
      };
    });
  }),
});
