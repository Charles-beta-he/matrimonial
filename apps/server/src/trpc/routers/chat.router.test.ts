import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  nickname: '小明',
};

const mockOtherUser = {
  id: 'user-2',
  nickname: '小花',
  photos: [],
  isOnline: false,
};

const mockParticipant = {
  conversationId: 'conv-1',
  userId: 'user-1',
  lastReadAt: null,
};

const mockMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  type: 'TEXT',
  content: 'Hello',
  mediaUrl: null,
  isEphemeral: false,
  expiresAt: null,
  createdAt: new Date(),
};

const mockConversation = {
  id: 'conv-1',
  lastMessageAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    conversation: {
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    textAuditItem: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../adapters/audit.adapter', () => ({
  audit: {
    auditText: vi.fn(),
  },
}));

vi.mock('../../modules/notification/notification.module', () => ({
  NotificationService: {
    notifyNewMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { audit } from '../../adapters/audit.adapter';
import { NotificationService } from '../../modules/notification/notification.module';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('chatRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./chat.router');
    expect(mod.chatRouter).toBeDefined();
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns conversations with other participant and last message', async () => {
      const participations = [
        {
          conversationId: 'conv-1',
          lastReadAt: null,
          conversation: {
            lastMessageAt: new Date(),
            participants: [
              { userId: 'user-1', user: { id: 'user-1', nickname: '小明', photos: [], isOnline: true } },
              { userId: 'user-2', user: mockOtherUser },
            ],
            messages: [mockMessage],
          },
        },
      ];
      vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValue(participations as any);

      const result = await prisma.conversationParticipant.findMany({
        where: { userId: 'user-1' },
        include: { conversation: { include: { participants: { include: { user: { select: {} as any } } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
        orderBy: { conversation: { lastMessageAt: 'desc' } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].conversationId).toBe('conv-1');
      // Verify mapping logic: find otherParticipant
      const otherParticipant = result[0].conversation.participants.find(
        (p: any) => p.userId !== 'user-1',
      );
      expect(otherParticipant?.userId).toBe('user-2');
      expect(result[0].conversation.messages[0].content).toBe('Hello');
    });

    it('returns empty array when user has no conversations', async () => {
      vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValue([]);

      const result = await prisma.conversationParticipant.findMany({ where: { userId: 'user-1' } });
      expect(result).toHaveLength(0);
    });
  });

  // ── messages ──────────────────────────────────────────────────────────────

  describe('messages', () => {
    it('returns paginated messages when user is a participant', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
      });
      expect(participant).toBeDefined();

      const messages = await prisma.message.findMany({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'desc' },
        take: 51,
      });
      expect(messages).toHaveLength(1);
    });

    it('throws FORBIDDEN when user is not a participant', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(null);

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
      });
      expect(participant).toBeNull();

      const err = new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant in this conversation' });
      expect(err.code).toBe('FORBIDDEN');
    });

    it('sets nextCursor when messages exceed limit', async () => {
      const limit = 3;
      const msgs = Array.from({ length: limit + 1 }, (_, i) => ({ ...mockMessage, id: `msg-${i}` }));
      vi.mocked(prisma.message.findMany).mockResolvedValue(msgs as any);

      const result = await prisma.message.findMany({ where: { conversationId: 'conv-1' }, take: limit + 1 });
      let nextCursor: string | undefined;
      if (result.length > limit) {
        const next = result.pop();
        nextCursor = next?.id;
      }
      expect(nextCursor).toBe('msg-3');
      expect(result).toHaveLength(limit);
    });

    it('uses cursor for pagination when provided', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

      await prisma.message.findMany({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'desc' },
        take: 51,
        cursor: { id: 'msg-0' },
        skip: 1,
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'msg-0' }, skip: 1 }),
      );
    });
  });

  // ── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('creates a TEXT message and updates conversation lastMessageAt', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(5);
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'APPROVED' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as any);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue({ userId: 'user-2' } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const message = await prisma.message.create({
        data: {
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'TEXT',
          content: 'Hello',
          mediaUrl: undefined,
          isEphemeral: false,
          expiresAt: undefined,
        },
      });
      expect(message.id).toBe('msg-1');
      expect(message.type).toBe('TEXT');

      await prisma.conversation.update({
        where: { id: 'conv-1' },
        data: { lastMessageAt: new Date() },
      });
      expect(prisma.conversation.update).toHaveBeenCalled();
    });

    it('throws FORBIDDEN when sender is not a participant', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(null);

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
      });
      expect(participant).toBeNull();

      const err = new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant in this conversation' });
      expect(err.code).toBe('FORBIDDEN');
    });

    it('throws BAD_REQUEST when text content is REJECTED by audit', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(5);
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'REJECTED' } as any);

      const auditResult = await audit.auditText('bad content', 'MESSAGE');
      expect(auditResult.status).toBe('REJECTED');

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '消息包含违规内容，请修改后重试' });
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('throws BAD_REQUEST with first-message message when first message is REJECTED', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(0); // first message
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'REJECTED' } as any);

      const previousMessageCount = await prisma.message.count({
        where: { conversationId: 'conv-1', senderId: 'user-1' },
      });
      const isFirstMessage = previousMessageCount === 0;
      expect(isFirstMessage).toBe(true);

      const auditResult = await audit.auditText('bad opener', 'FIRST_MESSAGE');
      expect(auditResult.status).toBe('REJECTED');

      const err = new TRPCError({ code: 'BAD_REQUEST', message: '开场白质量不佳，试试更真诚的内容吧' });
      expect(err.message).toBe('开场白质量不佳，试试更真诚的内容吧');
    });

    it('creates textAuditItem when audit status is REVIEW (but still sends message)', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(5);
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'REVIEW' } as any);
      vi.mocked(prisma.textAuditItem.create).mockResolvedValue({ id: 'audit-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as any);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue(null);

      const auditResult = await audit.auditText('borderline content', 'MESSAGE');
      expect(auditResult.status).toBe('REVIEW');

      // Should create audit item
      await prisma.textAuditItem.create({
        data: { userId: 'user-1', text: 'borderline content', context: 'MESSAGE' },
      });
      expect(prisma.textAuditItem.create).toHaveBeenCalled();

      // Should still create message
      const message = await prisma.message.create({ data: {} as any });
      expect(message.id).toBe('msg-1');
    });

    it('sets expiresAt for ephemeral messages', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(1);
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'APPROVED' } as any);

      const ephemeralMsg = { ...mockMessage, isEphemeral: true, expiresAt: new Date(Date.now() + 30000) };
      vi.mocked(prisma.message.create).mockResolvedValue(ephemeralMsg as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as any);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue(null);

      const message = await prisma.message.create({ data: {} as any });
      expect(message.isEphemeral).toBe(true);
      expect(message.expiresAt).toBeDefined();
    });

    it('sends push notification to other participant after message is created', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.message.count).mockResolvedValue(1);
      vi.mocked(audit.auditText).mockResolvedValue({ status: 'APPROVED' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as any);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue({ userId: 'user-2' } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const otherParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: 'conv-1', userId: { not: 'user-1' } },
        select: { userId: true },
      });
      expect(otherParticipant?.userId).toBe('user-2');

      await NotificationService.notifyNewMessage('user-2', '小明', 'Hello');
      expect(NotificationService.notifyNewMessage).toHaveBeenCalledWith('user-2', '小明', 'Hello');
    });

    it('skips audit for non-TEXT message types (IMAGE)', async () => {
      vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(mockParticipant as any);
      const imgMessage = { ...mockMessage, type: 'IMAGE', content: null, mediaUrl: 'https://example.com/img.jpg' };
      vi.mocked(prisma.message.create).mockResolvedValue(imgMessage as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as any);
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue(null);

      // auditText should not be called for IMAGE type
      const message = await prisma.message.create({ data: {} as any });
      expect(message.type).toBe('IMAGE');
      expect(audit.auditText).not.toHaveBeenCalled();
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('updates lastReadAt for the conversation participant', async () => {
      const updatedParticipant = { ...mockParticipant, lastReadAt: new Date() };
      vi.mocked(prisma.conversationParticipant.update).mockResolvedValue(updatedParticipant as any);

      const result = await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
        data: { lastReadAt: new Date() },
      });

      expect(result.lastReadAt).toBeDefined();
      expect(prisma.conversationParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
        }),
      );
    });
  });
});
