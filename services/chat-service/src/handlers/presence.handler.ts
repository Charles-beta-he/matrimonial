import type { Server, Socket } from 'socket.io';
import { getRedis } from '../lib/redis.js';

const PRESENCE_ONLINE_KEY = 'presence:online';
const PRESENCE_USER_TTL = 30; // seconds

// In-memory fallback: userId -> Set<socketId>
const onlineUsersFallback = new Map<string, Set<string>>();

async function markOnline(userId: string, socketId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.sadd(PRESENCE_ONLINE_KEY, userId);
      await redis.set(`presence:user:${userId}`, '1', 'EX', PRESENCE_USER_TTL);
      return;
    } catch {
      console.warn('[presence] Redis markOnline failed, falling back to in-memory');
    }
  }
  if (!onlineUsersFallback.has(userId)) onlineUsersFallback.set(userId, new Set());
  onlineUsersFallback.get(userId)!.add(socketId);
}

async function markOffline(userId: string, socketId: string): Promise<void> {
  // Remove this socketId from fallback regardless
  const sockets = onlineUsersFallback.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) onlineUsersFallback.delete(userId);
  }

  const redis = getRedis();
  if (redis) {
    try {
      // Only remove from online set when no more fallback sockets either
      // (Redis doesn't track per-socket, so treat any disconnect as offline)
      await redis.srem(PRESENCE_ONLINE_KEY, userId);
      await redis.del(`presence:user:${userId}`);
      return;
    } catch {
      console.warn('[presence] Redis markOffline failed, using in-memory fallback');
    }
  }
}

async function refreshHeartbeat(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`presence:user:${userId}`, '1', 'EX', PRESENCE_USER_TTL);
      return;
    } catch {
      // Silent — heartbeat failure is non-critical
    }
  }
}

async function isOnline(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const result = await redis.sismember(PRESENCE_ONLINE_KEY, userId);
      return result === 1;
    } catch {
      console.warn('[presence] Redis isOnline failed, falling back to in-memory');
    }
  }
  return onlineUsersFallback.has(userId) && onlineUsersFallback.get(userId)!.size > 0;
}

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;

  // Mark online on connect
  markOnline(userId, socket.id).catch(() => {});

  socket.on('presence:ping', () => {
    refreshHeartbeat(userId).catch(() => {});
    socket.emit('presence:pong', { timestamp: Date.now() });
  });

  socket.on('presence:check', async (data: { userIds: string[] }) => {
    const statuses = await Promise.all(
      data.userIds.map(async (uid) => ({
        userId: uid,
        online: await isOnline(uid),
      })),
    );
    socket.emit('presence:status', { statuses });
  });

  socket.on('disconnect', () => {
    markOffline(userId, socket.id).catch(() => {});
  });
}
