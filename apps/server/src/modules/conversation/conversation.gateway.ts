import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: env.CORS_ORIGINS,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** userId → Set of socket IDs */
  private userSockets = new Map<string, Set<string>>();

  async handleConnection(client: AuthSocket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) { client.disconnect(); return; }

      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      client.userId = payload.sub;

      const set = this.userSockets.get(payload.sub) ?? new Set<string>();
      set.add(client.id);
      this.userSockets.set(payload.sub, set);

      client.broadcast.emit('presence:online', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (!client.userId) return;
    const set = this.userSockets.get(client.userId);
    if (set) {
      set.delete(client.id);
      if (set.size === 0) {
        this.userSockets.delete(client.userId);
        this.server.emit('presence:offline', { userId: client.userId });
      }
    }
  }

  @SubscribeMessage('conversation:join')
  handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('conversation:leave')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      type: string;
      content?: string;
      mediaUrl?: string;
      tempId?: string;
    },
  ) {
    if (!client.userId) return;
    try {
      const message = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: client.userId,
          type: data.type as any,
          content: data.content,
          mediaUrl: data.mediaUrl,
        },
      });

      // Update conversation updatedAt
      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      const payload = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        content: message.content ?? undefined,
        mediaUrl: message.mediaUrl ?? undefined,
        createdAt: message.createdAt.toISOString(),
        status: 'sent',
      };

      // Broadcast to all in room (including sender)
      this.server.to(`conv:${data.conversationId}`).emit('message:new', payload);

      // Confirm to sender with tempId mapping
      if (data.tempId) {
        client.emit('message:sent', { tempId: data.tempId, message: payload });
      }
    } catch (err: any) {
      logger.error('ws message:send error', { error: err?.message });
    }
  }

  @SubscribeMessage('message:read')
  handleRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!client.userId) return;
    // Broadcast read receipt to others in the conversation room.
    // Persistent last-read timestamp is updated via tRPC chat.markRead.
    client.to(`conv:${data.conversationId}`).emit('message:read_receipt', {
      conversationId: data.conversationId,
      readBy: client.userId,
      lastReadMessageId: data.messageId,
      readAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }
}
