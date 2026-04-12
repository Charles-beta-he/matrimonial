import type { Server, Socket } from 'socket.io';

export function registerMessageHandlers(io: Server, socket: Socket) {
  // Send message
  socket.on('message:send', (data: { conversationId: string; type: string; content?: string; mediaUrl?: string; tempId: string }) => {
    const senderId = socket.data.userId;
    const message = {
      id: `msg_${Date.now()}`, // In production: save to DB and use real ID
      conversationId: data.conversationId,
      senderId,
      type: data.type,
      content: data.content,
      mediaUrl: data.mediaUrl,
      createdAt: new Date().toISOString(),
      tempId: data.tempId,
    };

    // Send to conversation room
    io.to(`conversation:${data.conversationId}`).emit('message:new', message);

    // Confirm to sender
    socket.emit('message:sent', { tempId: data.tempId, message });
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
