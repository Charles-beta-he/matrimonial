import { TRPCError } from '@trpc/server';
import { LiveKitAdapter } from '../../adapters/livekit.adapter';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

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

// Quick match queue — users waiting for random pairing
interface QueueEntry {
  userId: string;
  nickname: string;
  gender: string;
  preferredGender?: string;
  joinedAt: number;
}

const quickMatchQueue: QueueEntry[] = [];

// Clean stale entries (older than 2 minutes)
setInterval(() => {
  const twoMinAgo = Date.now() - 2 * 60 * 1000;
  while (quickMatchQueue.length > 0 && quickMatchQueue[0].joinedAt < twoMinAgo) {
    quickMatchQueue.shift();
  }
}, 30_000);

// In-memory store for active matchmaker rooms.
// TODO: Move to Redis for production multi-instance deployments.
const activeRooms = new Map<string, MatchmakerRoom>();

// Cleanup stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of activeRooms.entries()) {
    if (now - room.createdAt > 4 * 60 * 60 * 1000) {
      activeRooms.delete(id);
    }
  }
}, 5 * 60 * 1000);

export const VideoService = {
  /** Start a 1v1 video call. Both users must have matched. */
  async start1v1Call(fromUserId: string, toUserId: string) {
    // Verify they have matched
    const match = await prisma.like.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId, isMatched: true },
          { fromUserId: toUserId, toUserId: fromUserId, isMatched: true },
        ],
      },
    });

    if (!match) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '只能与匹配成功的用户视频通话' });
    }

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

  /** Join an existing matchmaker room (as participant) */
  async joinMatchmakerRoom(userId: string, roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: '房间不存在或已关闭' });
    if (room.participants.length >= room.maxParticipants) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '房间已满' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

    // Add participant
    const existing = room.participants.find((p) => p.userId === userId);
    if (!existing) {
      room.participants.push({ userId, nickname: user.nickname, joinedAt: Date.now() });
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

  /** Create a matchmaker room (host only, requires verified user) */
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
    activeRooms.set(id, room);

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

  /** List active matchmaker rooms */
  listMatchmakerRooms() {
    return Array.from(activeRooms.values()).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      hostName: r.hostName,
      participantCount: r.participants.length,
      maxParticipants: r.maxParticipants,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  /** Join quick match queue — returns match immediately if compatible user waiting */
  async joinQuickMatch(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, gender: true, verificationLevel: true },
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
    if (user.verificationLevel === 'L1') {
      throw new TRPCError({ code: 'FORBIDDEN', message: '需要完成身份认证才能参与视频速配' });
    }

    // Check if already in queue
    const existing = quickMatchQueue.findIndex((e) => e.userId === userId);
    if (existing >= 0) quickMatchQueue.splice(existing, 1);

    // Try to find a match in the queue
    const preferredGender = user.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const matchIdx = quickMatchQueue.findIndex(
      (e) => e.gender === preferredGender && e.userId !== userId,
    );

    if (matchIdx >= 0) {
      // Found a match! Create a room
      const partner = quickMatchQueue.splice(matchIdx, 1)[0];
      const roomName = LiveKitAdapter.generateOneOnOneRoomName(userId, partner.userId);
      const ttl = 5 * 60; // 5 minutes (3 min call + buffer)

      const myToken = LiveKitAdapter.generateToken({
        userId,
        userName: user.nickname,
        roomName,
        ttl,
      });
      const partnerToken = LiveKitAdapter.generateToken({
        userId: partner.userId,
        userName: partner.nickname,
        roomName,
        ttl,
      });

      const roomId = `qm_${Date.now().toString(36)}`;
      const quickRoom = {
        id: roomId,
        roomName,
        users: [
          { userId, nickname: user.nickname, token: myToken.token },
          { userId: partner.userId, nickname: partner.nickname, token: partnerToken.token },
        ],
        wsUrl: myToken.wsUrl,
        duration: 180, // 3 minutes in seconds
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

    // No match — join queue
    quickMatchQueue.push({
      userId,
      nickname: user.nickname,
      gender: user.gender,
      preferredGender,
      joinedAt: Date.now(),
    });

    logger.info('quick match queued', { userId, queueSize: quickMatchQueue.length });
    return {
      status: 'queued' as const,
      position: quickMatchQueue.length,
    };
  },

  /** Leave quick match queue */
  leaveQuickMatch(userId: string) {
    const idx = quickMatchQueue.findIndex((e) => e.userId === userId);
    if (idx >= 0) quickMatchQueue.splice(idx, 1);
  },

  /** Check quick match queue status */
  getQuickMatchStatus(userId: string) {
    const entry = quickMatchQueue.find((e) => e.userId === userId);
    if (!entry) return { inQueue: false as const, position: 0 };
    const position = quickMatchQueue.indexOf(entry) + 1;
    return { inQueue: true as const, position };
  },

  /** Leave matchmaker room */
  leaveMatchmakerRoom(userId: string, roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room) return;
    room.participants = room.participants.filter((p) => p.userId !== userId);
    // If host leaves, close room
    if (userId === room.hostId || room.participants.length === 0) {
      activeRooms.delete(roomId);
    }
  },
};
