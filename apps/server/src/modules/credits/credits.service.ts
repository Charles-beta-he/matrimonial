import { TRPCError } from '@trpc/server';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

type ConsumableKind = 'SUPER_LIKE' | 'LOVE_LETTER' | 'VIDEO_TICKET';

export const CreditsService = {
  /** Get user's current credit balance, creating if missing */
  async getBalance(userId: string) {
    let credits = await prisma.userCredits.findUnique({ where: { userId } });
    if (!credits) {
      credits = await prisma.userCredits.create({ data: { userId } });
    }
    return credits;
  },

  /** Grant credits — called from payment activation */
  async grant(userId: string, kind: ConsumableKind | 'BOOST', amount: number, reason: string, orderId?: string) {
    const balance = await this.getBalance(userId);

    const updateData: any = {};
    if (kind === 'SUPER_LIKE') updateData.superLikes = balance.superLikes + amount;
    else if (kind === 'LOVE_LETTER') updateData.loveLetters = balance.loveLetters + amount;
    else if (kind === 'VIDEO_TICKET') updateData.videoTickets = balance.videoTickets + amount;
    else if (kind === 'BOOST') {
      const now = new Date();
      const baseTime = balance.boostUntil && balance.boostUntil > now ? balance.boostUntil : now;
      updateData.boostUntil = new Date(baseTime.getTime() + amount * 60 * 1000);  // amount = minutes
    }

    await prisma.$transaction([
      prisma.userCredits.update({ where: { userId }, data: updateData }),
      prisma.creditTransaction.create({
        data: { userId, kind, amount, reason, orderId },
      }),
    ]);

    logger.info('credits granted', { userId, kind, amount, reason });
  },

  /** Consume credits — throws if insufficient */
  async consume(userId: string, kind: ConsumableKind, amount: number = 1, reason: string) {
    const balance = await this.getBalance(userId);

    const field = kind === 'SUPER_LIKE' ? 'superLikes' : kind === 'LOVE_LETTER' ? 'loveLetters' : 'videoTickets';
    const current = balance[field];

    if (current < amount) {
      throw new TRPCError({ code: 'FAILED_PRECONDITION', message: `${kind} 余额不足` });
    }

    await prisma.$transaction([
      prisma.userCredits.update({
        where: { userId },
        data: { [field]: current - amount },
      }),
      prisma.creditTransaction.create({
        data: { userId, kind, amount: -amount, reason },
      }),
    ]);

    logger.info('credits consumed', { userId, kind, amount, reason });
  },

  /** Check if user has active boost */
  async isBoostActive(userId: string): Promise<boolean> {
    const credits = await prisma.userCredits.findUnique({ where: { userId } });
    return !!(credits?.boostUntil && credits.boostUntil > new Date());
  },
};
