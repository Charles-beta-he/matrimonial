import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!REDIS_URL) {
    console.warn('[chat] REDIS_URL not set, Redis unavailable — using in-memory fallback');
    return null;
  }
  try {
    _redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    _redis.on('error', () => {});
    return _redis;
  } catch {
    console.warn('[chat] Failed to create Redis client, using in-memory fallback');
    return null;
  }
}

/** Create a duplicate Redis client for pub/sub (subscribe mode blocks regular commands). */
export function createRedisClient(): Redis | null {
  if (!REDIS_URL) return null;
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    client.on('error', () => {});
    return client;
  } catch {
    return null;
  }
}
