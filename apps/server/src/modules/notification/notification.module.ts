// NestJS module stub — kept for app.module.ts compatibility
export class NotificationModule {}

import { prisma } from '../../lib/prisma';
import { push } from '../../adapters/push.adapter';
import { logger } from '../../lib/logger';

export const NotificationService = {
  /** Send push to a specific user */
  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, isOnline: true },
    });
    if (!user?.pushToken) return;
    // Don't push if user is currently online
    if (user.isOnline) return;

    await push.sendToUser(userId, user.pushToken, { title, body, data });
    logger.info('push sent', { userId, title });
  },

  /** Notify when someone likes you */
  async notifyNewLike(toUserId: string, fromNickname: string) {
    await this.sendToUser(toUserId, '有人喜欢你 ❤️', `${fromNickname} 对你表示了好感`, {
      type: 'new_like',
    });
  },

  /** Notify on match success */
  async notifyMatch(userId: string, matchedNickname: string, conversationId: string) {
    await this.sendToUser(userId, '匹配成功! 🎉', `你和 ${matchedNickname} 匹配了，快去打个招呼`, {
      type: 'match',
      conversationId,
    });
  },

  /** Notify on new message (offline only) */
  async notifyNewMessage(toUserId: string, fromNickname: string, preview: string) {
    const truncated = preview.length > 30 ? preview.slice(0, 30) + '...' : preview;
    await this.sendToUser(toUserId, `${fromNickname} 发来消息`, truncated, {
      type: 'new_message',
    });
  },

  /** Recall inactive users — run as scheduled job */
  async recallInactiveUsers() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Users inactive 3-7 days with push tokens
    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: { gte: sevenDaysAgo, lt: threeDaysAgo },
        pushToken: { not: null },
        status: 'ACTIVE',
      },
      select: { id: true, pushToken: true, nickname: true },
      take: 100, // Batch limit
    });

    if (inactiveUsers.length === 0) return;

    // Check if any of them have new likes
    for (const user of inactiveUsers) {
      const recentLikes = await prisma.like.count({
        where: {
          toUserId: user.id,
          createdAt: { gte: threeDaysAgo },
        },
      });

      const message =
        recentLikes > 0
          ? `你有 ${recentLikes} 个新的喜欢，快来看看是谁`
          : '好久不见，新的推荐已为你准备好啦';

      await push.sendToUser(user.id, user.pushToken!, {
        title: '想你了 👋',
        body: message,
        data: { type: 'recall' },
      });
    }

    logger.info('recall push sent', { count: inactiveUsers.length });
  },
};
