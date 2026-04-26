import type { Server, Socket } from 'socket.io';
import { MessageType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function registerMessageHandlers(io: Server, socket: Socket) {
  // Send message
  socket.on('message:send', async (data: { conversationId: string; type: string; content?: string; mediaUrl?: string; tempId: string }) => {
    const senderId = socket.data.userId as string;

    try {
      // Validate sender is a participant of the conversation
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: data.conversationId,
            userId: senderId,
          },
        },
      });

      if (!participant) {
        socket.emit('message:error', { reason: 'Not a participant of this conversation' });
        return;
      }

      // Persist message and update conversation in a transaction
      const saved = await prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            conversationId: data.conversationId,
            senderId,
            type: data.type as MessageType,
            content: data.content ?? null,
            mediaUrl: data.mediaUrl ?? null,
          },
        });

        await tx.conversation.update({
          where: { id: data.conversationId },
          data: { lastMessageAt: msg.createdAt },
        });

        return msg;
      });

      const payload = {
        id: saved.id,
        conversationId: saved.conversationId,
        senderId: saved.senderId,
        type: saved.type,
        content: saved.content,
        mediaUrl: saved.mediaUrl,
        createdAt: saved.createdAt.toISOString(),
        tempId: data.tempId,
      };

      // Broadcast to conversation room (includes sender)
      io.to(`conversation:${data.conversationId}`).emit('message:new', payload);

      // Confirm to sender with tempId mapping
      socket.emit('message:sent', { tempId: data.tempId, message: payload });
    } catch (err) {
      console.error('[message.handler] message:send failed:', (err as Error).message);
      socket.emit('message:error', { reason: 'Failed to save message' });
    }
  });

  // Join conversation room
  socket.on('conversation:join', (data: { conversationId: string }) => {
    socket.join(`conversation:${data.conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (data: { conversationId: string }) => {
    socket.leave(`conversation:${data.conversationId}`);
  });

  // Mark as read
  socket.on('message:read', (data: { conversationId: string; messageId: string }) => {
    io.to(`conversation:${data.conversationId}`).emit('message:read_receipt', {
      conversationId: data.conversationId,
      readBy: socket.data.userId,
      lastReadMessageId: data.messageId,
      readAt: new Date().toISOString(),
    });
  });
}
