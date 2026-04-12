import type { Server, Socket } from 'socket.io';

export function registerTypingHandlers(_io: Server, socket: Socket) {
  socket.on('typing:start', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: socket.data.userId,
    });
  });

  socket.on('typing:stop', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: socket.data.userId,
    });
  });
}
