import type { Server, Socket } from 'socket.io';

const onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Track connection
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socket.id);

  socket.on('presence:ping', () => {
    socket.emit('presence:pong', { timestamp: Date.now() });
  });

  socket.on('presence:check', (data: { userIds: string[] }) => {
    const statuses = data.userIds.map(uid => ({
      userId: uid,
      online: onlineUsers.has(uid) && onlineUsers.get(uid)!.size > 0,
    }));
    socket.emit('presence:status', { statuses });
  });

  socket.on('disconnect', () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }
  });
}
