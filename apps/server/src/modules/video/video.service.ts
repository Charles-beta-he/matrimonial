import { TRPCError } from '@trpc/server';
import { LiveKitAdapter } from '../../adapters/livekit.adapter';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { getRedis } from '../../lib/redis';

interface MatchmakerRoom {
  id: string;
  roomName: string;
  hostId: string;
  hostName: string;
  title: string;
  category: string;
  participants: Array<{ userId: string; nickname: string; joinedAt: number }>;
  maxParticipants: number;
  createdAt: number;
}

interface QueueEntry {
  userId: string;
  nickname: string;
  gender: string;
  preferredGender?: string;
  joinedAt: number;
}

const ROOM_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const QUEUE_TTL_SECONDS = 2 * 60;     // 2 minutes per entry

// ── Redis helpers ──────────────────────────────────────────────────────────

function roomKey(id: string) { return `video:room:${id}`; }
function roomIndexKey() { return 'video:rooms'; }
function queueKey() { return 'video:quickmatch:queue'; }

async function saveRoom(room: MatchmakerRoom): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(roomKey(room.id), JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);
    await redis.sadd(roomIndexKey(), room.id);
    await redis.expire(roomIndexKey(), ROOM_TTL_SECONDS);
  } else {
    inMemoryRooms.set(room.id, room);
  }
}

async function getRoom(id: string): Promise<MatchmakerRoom | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(roomKey(id));
    return raw ? (JSON.parse(raw) as MatchmakerRoom) : null;
  }
  return inMemoryRooms.get(id) ?? null;
}

async function deleteRoom(id: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(roomKey(id));
    await redis.srem(roomIndexKey(), id);
  } else {
    inMemoryRooms.delete(id);
  }
}

async function listRooms(): Promise<MatchmakerRoom[]> {
  const redis = getRedis();
  if (redis) {
    const ids = await redis.smembers(roomIndexKey());
    if (ids.length === 0) return [];
    const raws = await redis.mget(...ids.map(roomKey));
    return raws.filter(Boolean).map((r) => JSON.parse(r!) as MatchmakerRoom);
  }
  return Array.from(inMemoryRooms.values());
}

async function enqueueUser(entry: QueueEntry): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.zadd(queueKey(), entry.joinedAt, JSON.stringify(entry));
    await redis.expire(queueKey(), QUEUE_TTL_SECONDS * 60);
  } else {
    const idx = inMemoryQueue.findIndex((e) => e.userId === entry.userId);
    if (idx >= 0) inMemoryQueue.splice(idx, 1);
    inMemoryQueue.push(entry);
  }
}

async function dequeueUser(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const members = await redis.zrange(queueKey(), 0, -1);
    for (const m of members) {
      const e = JSON.parse(m) as QueueEntry;
      if (e.userId === userId) { await redis.zrem(queueKey(), m); break; }
    }
  } else {
    const idx = inMemoryQueue.findIndex((e) => e.userId === userId);
    if (idx >= 0) inMemoryQueue.splice(idx, 1);
  }
}

async function findMatchInQueue(excludeUserId: string, preferredGender: string): Promise<{ entry: QueueEntry; raw: string } | null> {
  const redis = getRedis();
  if (redis) {
    // Remove stale entries older than 2 minutes
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    await redis.zremrangebyscore(queueKey(), '-inf', twoMinAgo);
    const members = await redis.zrange(queueKey(), 0, -1);
    for (const m of members) {
      const e = JSON.parse(m) as QueueEntry;
      if (e.userId !== excludeUserId && e.gender === preferredGender) {
        return { entry: e, raw: m };
      }
    }
    return null;
  }
  // In-memory fallback
  const twoMinAgo = Date.now() - 2 * 60 * 1000;
  const idx = inMemoryQueue.findIndex(
    (e) => e.userId !== excludeUserId && e.gender === preferredGender && e.joinedAt >= twoMinAgo,
  );
  if (idx < 0) return null;
  return { entry: inMemoryQueue[idx], raw: '' };
}

async function removeFromQueue(userId: string, raw: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.zrem(queueKey(), raw);
  } else {
    const idx = inMemoryQueue.findIndex((e) => e.userId === userId);
    if (idx >= 0) inMemoryQueue.splice(idx, 1);
  }
}

async function getQueueEntry(userId: string): Promise<{ entry: QueueEntry; position: number } | null> {
  const redis = getRedis();
  if (redis) {
    const members = await redis.zrange(queueKey(), 0, -1, 'WITHSCORES');
    for (let i = 0; i < members.length; i += 2) {
      const e = JSON.parse(members[i]) as QueueEntry;
      if (e.userId === userId) return { entry: e, position: Math.floor(i / 2) + 1 };
    }
    return null;
  }
  const idx = inMemoryQueue.findIndex((e) => e.userId === userId);
  if (idx < 0) return null;
  return { entry: inMemoryQueue[idx], position: idx + 1 };
}

// ── In-memory fallback (used when Redis unavailable) ───────────────────────
const inMemoryRooms = new Map<string, MatchmakerRoom>();
const inMemoryQueue: QueueEntry[] = [];

// Cleanup interval for in-memory fallback only (Redis uses TTL/zadd score)
setInterval(() => {
  const redis = getRedis();
  if (redis) return;
  const now = Date.now();
  for (const [id, room] of inMemoryRooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_SECONDS * 1000) inMemoryRooms.delete(id);
  }
  const twoMinAgo = now - 2 * 60 * 1000;
  let i = 0;
  while (i < inMemoryQueue.length && inMemoryQueue[i].joinedAt < twoMinAgo) i++;
  if (i > 0) inMemoryQueue.splice(0, i);
}, 60_000);

// ── VideoService ───────────────────────────────────────────────────────────

export const VideoService = {
  async start1v1Call(fromUserId: string, toUserId: string) {
    const match = await prisma.like.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId, isMatched: true },
          { fromUserId: toUserId, toUserId: fromUserId, isMatched: true },
        ],
      },
    });
    if (!match) throw new TRPCError({ code: 'FORBIDDEN', message: '只能与匹配成功的用户视频通话' });

    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
    if (!fromUser) throw new TRPCError({ code: 'NOT_FOUND' });

    const roomName = LiveKitAdapter.generateOneOnOneRoomName(fromUserId, toUserId);
    const { token, wsUrl } = LiveKitAdapter.generateToken({
      userId: fromUserId,
      userName: fromUser.nickname,
      roomName,
      ttl: 60 * 60,
    });

    logger.info('1v1 call started', { fromUserId, toUserId, roomName });
    return { roomName, token, wsUrl, targetUserId: toUserId };
  },

  async joinMatchmakerRoom(userId: string, roomId: string) {
    const room = await getRoom(roomId);
    if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: '房间不存在或已关闭' });
    if (room.participants.length >= room.maxParticipants) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '房间已满' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

    if (!room.participants.find((p) => p.userId === userId)) {
      room.participants.push({ userId, nickname: user.nickname, joinedAt: Date.now() });
      await saveRoom(room);
    }

    const { token, wsUrl } = LiveKitAdapter.generateToken({
      userId,
      userName: user.nickname,
      roomName: room.roomName,
      role: 'publisher',
      ttl: 2 * 60 * 60,
    });

    return { room, token, wsUrl };
  },

  async createMatchmakerRoom(
    hostId: string,
    params: { title: string; category: string; maxParticipants?: number },
  ) {
    const host = await prisma.user.findUnique({ where: { id: hostId } });
    if (!host) throw new TRPCError({ code: 'NOT_FOUND' });
    if (host.verificationLevel === 'L1') {
      throw new TRPCError({ code: 'FORBIDDEN', message: '需要完成身份认证才能创建房间' });
    }

    const roomName = LiveKitAdapter.generateMatchmakerRoomName(hostId);
    const id = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const room: MatchmakerRoom = {
      id,
      roomName,
      hostId,
      hostName: host.nickname,
      title: params.title,
      category: params.category,
      participants: [{ userId: hostId, nickname: host.nickname, joinedAt: Date.now() }],
      maxParticipants: params.maxParticipants ?? 6,
      createdAt: Date.now(),
    };
    await saveRoom(room);

    const { token, wsUrl } = LiveKitAdapter.generateToken({
      userId: hostId,
      userName: host.nickname,
      roomName,
      role: 'publisher',
      ttl: 4 * 60 * 60,
    });

    logger.info('matchmaker room created', { hostId, roomId: id });
    return { room, token, wsUrl };
  },

  async listMatchmakerRooms() {
    const rooms = await listRooms();
    return rooms.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      hostName: r.hostName,
      participantCount: r.participants.length,
      maxParticipants: r.maxParticipants,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async joinQuickMatch(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, gender: true, verificationLevel: true },
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
    if (user.verificationLevel === 'L1') {
      throw new TRPCError({ code: 'FORBIDDEN', message: '需要完成身份认证才能参与视频速配' });
    }

    await dequeueUser(userId);

    const preferredGender = user.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const found = await findMatchInQueue(userId, preferredGender);

    if (found) {
      const partner = found.entry;
      await removeFromQueue(partner.userId, found.raw);

      const roomName = LiveKitAdapter.generateOneOnOneRoomName(userId, partner.userId);
      const ttl = 5 * 60;

      const myToken = LiveKitAdapter.generateToken({ userId, userName: user.nickname, roomName, ttl });
      const partnerToken = LiveKitAdapter.generateToken({ userId: partner.userId, userName: partner.nickname, roomName, ttl });

      const roomId = `qm_${Date.now().toString(36)}`;
      const quickRoom = {
        id: roomId,
        roomName,
        users: [
          { userId, nickname: user.nickname, token: myToken.token },
          { userId: partner.userId, nickname: partner.nickname, token: partnerToken.token },
        ],
        wsUrl: myToken.wsUrl,
        duration: 180,
        createdAt: Date.now(),
      };

      logger.info('quick match paired', { user1: userId, user2: partner.userId, roomId });
      return {
        status: 'matched' as const,
        room: quickRoom,
        myToken: myToken.token,
        wsUrl: myToken.wsUrl,
        partner: { userId: partner.userId, nickname: partner.nickname },
        duration: 180,
      };
    }

    await enqueueUser({ userId, nickname: user.nickname, gender: user.gender, preferredGender, joinedAt: Date.now() });
    const pos = await getQueueEntry(userId);
    logger.info('quick match queued', { userId });
    return { status: 'queued' as const, position: pos?.position ?? 1 };
  },

  async leaveQuickMatch(userId: string) {
    await dequeueUser(userId);
  },

  async getQuickMatchStatus(userId: string) {
    const result = await getQueueEntry(userId);
    if (!result) return { inQueue: false as const, position: 0 };
    return { inQueue: true as const, position: result.position };
  },

  async leaveMatchmakerRoom(userId: string, roomId: string) {
    const room = await getRoom(roomId);
    if (!room) return;
    room.participants = room.participants.filter((p) => p.userId !== userId);
    if (userId === room.hostId || room.participants.length === 0) {
      await deleteRoom(roomId);
    } else {
      await saveRoom(room);
    }
  },
};
