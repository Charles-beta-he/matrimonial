import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushAdapter {
  sendToUser(
    userId: string,
    registrationId: string | null,
    payload: PushPayload,
  ): Promise<void>;
  sendToUsers(
    users: Array<{ userId: string; registrationId: string | null }>,
    payload: PushPayload,
  ): Promise<void>;
}

const mockAdapter: PushAdapter = {
  async sendToUser(userId, _regId, payload) {
    logger.info('mock push', { userId, title: payload.title });
  },
  async sendToUsers(users, payload) {
    logger.info('mock push batch', { count: users.length, title: payload.title });
  },
};

const jpushAdapter: PushAdapter = {
  async sendToUser(_userId, regId, payload) {
    if (!regId) return;
    const auth = Buffer.from(`${env.JPUSH_APP_KEY}:${env.JPUSH_MASTER_SECRET}`).toString('base64');
    try {
      const res = await fetch('https://api.jpush.cn/v3/push', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'all',
          audience: { registration_id: [regId] },
          notification: {
            alert: payload.body,
            android: { title: payload.title, extras: payload.data },
            ios: {
              alert: { title: payload.title, body: payload.body },
              sound: 'default',
              extras: payload.data,
            },
          },
        }),
      });
      if (!res.ok) logger.error('jpush fail', { status: res.status });
    } catch (err: any) {
      logger.error('jpush error', { error: err?.message });
    }
  },
  async sendToUsers(users, payload) {
    const ids = users.map((u) => u.registrationId).filter(Boolean) as string[];
    if (ids.length === 0) return;
    const auth = Buffer.from(`${env.JPUSH_APP_KEY}:${env.JPUSH_MASTER_SECRET}`).toString('base64');
    await fetch('https://api.jpush.cn/v3/push', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'all',
        audience: { registration_id: ids },
        notification: {
          alert: payload.body,
          android: { title: payload.title },
          ios: { alert: { title: payload.title, body: payload.body } },
        },
      }),
    }).catch((err) => logger.error('jpush batch error', { error: err?.message }));
  },
};

if (!isConfigured('jpush')) {
  logger.warn('push adapter falling back to mock — JPUSH_* not set');
}

export const push: PushAdapter = isConfigured('jpush') ? jpushAdapter : mockAdapter;
