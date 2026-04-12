import { sendMessageSchema } from '@matrimonial/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../base';

export const chatRouter = router({
  /** List all conversations for the current user with last message and unread count */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const participations = await ctx.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    photos: {
                      where: { isAvatar: true, auditStatus: 'APPROVED' },
                      take: 1,
                    },
                    isOnline: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    return participations.map((p) => {
      const otherParticipant = p.conversation.participants.find(
        (part) => part.userId !== userId,
      );
      const lastMessage = p.conversation.messages[0] ?? null;

      return {
        conversationId: p.conversationId,
        otherUser: otherParticipant?.user ?? null,
        lastMessage,
        lastReadAt: p.lastReadAt,
        lastMessageAt: p.conversation.lastMessageAt,
      };
    });
  }),

  /** Get paginated messages for a conversation */
  messages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify user is a participant
      const participant =
        await ctx.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: input.conversationId,
              userId,
            },
          },
        });
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a participant in this conversation',
        });
      }

      const messages = await ctx.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const next = messages.pop();
        nextCursor = next?.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  /** Send a message in a conversation */
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify user is a participant
      const participant =
        await ctx.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: input.conversationId,
              userId,
            },
          },
        });
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a participant in this conversation',
        });
      }

      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: userId,
          type: input.type,
          content: input.content,
          mediaUrl: input.mediaUrl,
          isEphemeral: input.isEphemeral,
          expiresAt: input.isEphemeral
            ? new Date(Date.now() + 30 * 1000) // 30 seconds for ephemeral
            : undefined,
        },
      });

      // Update conversation lastMessageAt
      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      return message;
    }),

  /** Mark a conversation as read */
  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      return ctx.prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: input.conversationId,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      });
    }),
});
