import { NotificationService } from '../modules/notification/notification.module';
import { logger } from '../lib/logger';

/** Run recall push every 6 hours */
export function startRecallJob() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      await NotificationService.recallInactiveUsers();
    } catch (err: any) {
      logger.error('recall job failed', { error: err?.message });
    }
  }, SIX_HOURS);

  logger.info('recall job scheduled (every 6h)');
}
