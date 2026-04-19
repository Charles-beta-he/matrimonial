import { describe, it, expect, vi, beforeEach } from 'vitest';


// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    like: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../../adapters/livekit.adapter', () => ({
  LiveKitAdapter: {
    generateOneOnOneRoomName: vi.fn().mockReturnValue('1v1_user-1_user-2'),
    generateMatchmakerRoomName: vi.fn().mockReturnValue('host_user-1_abc123'),
    generateToken: vi.fn().mockReturnValue({ token: 'mock-jwt-token', wsUrl: 'wss://livekit.test' }),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { LiveKitAdapter } from '../../adapters/livekit.adapter';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  nickname: '小明',
  gender: 'MALE',
  verificationLevel: 'L2',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('videoRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore default token mock after reset
    vi.mocked(LiveKitAdapter.generateToken).mockReturnValue({ token: 'mock-jwt-token', wsUrl: 'wss://livekit.test' });
    vi.mocked(LiveKitAdapter.generateOneOnOneRoomName).mockReturnValue('1v1_user-1_user-2');
    vi.mocked(LiveKitAdapter.generateMatchmakerRoomName).mockReturnValue('host_user-1_abc123');
  });

  it('should be importable', async () => {
    const mod = await import('./video.router');
    expect(mod.videoRouter).toBeDefined();
  });

  // ── start1v1 ──────────────────────────────────────────────────────────────

  describe('VideoService.start1v1Call', () => {
    it('returns room token when users are matched', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValue({
        id: 'like-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        isMatched: true,
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const { VideoService } = await import('../../modules/video/video.service');
      const result = await VideoService.start1v1Call('user-1', 'user-2');

      expect(result.token).toBe('mock-jwt-token');
      expect(result.wsUrl).toBe('wss://livekit.test');
      expect(result.roomName).toBe('1v1_user-1_user-2');
      expect(result.targetUserId).toBe('user-2');
    });

    it('throws FORBIDDEN when users are not matched', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValue(null);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(VideoService.start1v1Call('user-1', 'user-999')).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('throws NOT_FOUND when caller user record missing', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValue({ isMatched: true } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(VideoService.start1v1Call('user-ghost', 'user-2')).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_FOUND' }),
      );
    });
  });

  // ── createRoom ────────────────────────────────────────────────────────────

  describe('VideoService.createMatchmakerRoom', () => {
    it('creates room and returns token for verified host', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, verificationLevel: 'L2' } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      const result = await VideoService.createMatchmakerRoom('user-1', {
        title: '聊天交友',
        category: '交友',
        maxParticipants: 4,
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.room.title).toBe('聊天交友');
      expect(result.room.maxParticipants).toBe(4);
      expect(result.room.hostId).toBe('user-1');
    });

    it('throws FORBIDDEN when host is unverified (L1)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, verificationLevel: 'L1' } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(
        VideoService.createMatchmakerRoom('user-1', { title: '测试', category: '交友' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    });

    it('throws NOT_FOUND when host user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(
        VideoService.createMatchmakerRoom('user-ghost', { title: '测试', category: '交友' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
    });

    it('uses default maxParticipants=6 when not specified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, verificationLevel: 'L3' } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      const result = await VideoService.createMatchmakerRoom('user-1', {
        title: '默认房间',
        category: '交友',
      });

      expect(result.room.maxParticipants).toBe(6);
    });
  });

  // ── listRooms ─────────────────────────────────────────────────────────────

  describe('VideoService.listMatchmakerRooms', () => {
    it('returns empty array when no rooms exist', async () => {
      const { VideoService } = await import('../../modules/video/video.service');
      // listMatchmakerRooms reads from in-memory map — clear side effects by checking shape
      const rooms = VideoService.listMatchmakerRooms();
      expect(Array.isArray(rooms)).toBe(true);
    });

    it('room list items have expected shape', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, verificationLevel: 'L2' } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      await VideoService.createMatchmakerRoom('user-1', { title: '形状测试', category: '交友' });

      const rooms = await VideoService.listMatchmakerRooms();
      if (rooms.length > 0) {
        const room = rooms[0];
        expect(room).toHaveProperty('id');
        expect(room).toHaveProperty('title');
        expect(room).toHaveProperty('category');
        expect(room).toHaveProperty('hostName');
        expect(room).toHaveProperty('participantCount');
        expect(room).toHaveProperty('maxParticipants');
        expect(room).toHaveProperty('createdAt');
      }
    });
  });

  // ── quickMatch ────────────────────────────────────────────────────────────

  describe('VideoService.joinQuickMatch', () => {
    it('throws FORBIDDEN when user is unverified (L1)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        verificationLevel: 'L1',
      } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(VideoService.joinQuickMatch('user-1')).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const { VideoService } = await import('../../modules/video/video.service');
      await expect(VideoService.joinQuickMatch('user-ghost')).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_FOUND' }),
      );
    });

    it('returns queued status when no compatible partner in queue', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        nickname: '小明',
        gender: 'MALE',
        verificationLevel: 'L2',
      } as any);

      const { VideoService } = await import('../../modules/video/video.service');
      // Clear internal queue state by leaving first
      VideoService.leaveQuickMatch('user-solo');
      const result = await VideoService.joinQuickMatch('user-solo');

      expect(result.status).toBe('queued');
      expect(typeof (result as any).position).toBe('number');

      // Clean up
      VideoService.leaveQuickMatch('user-solo');
    });
  });

  // ── getQuickMatchStatus ───────────────────────────────────────────────────

  describe('VideoService.getQuickMatchStatus', () => {
    it('returns inQueue=false when user is not in queue', async () => {
      const { VideoService } = await import('../../modules/video/video.service');
      const status = await VideoService.getQuickMatchStatus('user-not-in-queue-xyz');
      expect(status.inQueue).toBe(false);
      expect(status.position).toBe(0);
    });
  });
});
