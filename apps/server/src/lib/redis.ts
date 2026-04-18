import Redis from 'ioredis';
import { env } from './env';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    _redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    _redis.on('error', () => {});
    return _redis;
  } catch {
    return null;
  }
}
