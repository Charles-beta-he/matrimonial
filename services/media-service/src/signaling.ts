import { Server } from 'socket.io';
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 3003);

export function createSignalingServer() {
  const httpServer = http.createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    // Join a call room
    socket.on('call:join', (data: { roomId: string; userId: string }) => {
      socket.join(`call:${data.roomId}`);
      socket.data.userId = data.userId;
      socket.data.roomId = data.roomId;
      socket.to(`call:${data.roomId}`).emit('call:user_joined', { userId: data.userId });
    });

    // WebRTC signaling (types are opaque objects relayed between browser peers)
    socket.on('signal:offer', (data: { targetUserId: string; offer: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('signal:offer', {
        fromUserId: socket.data.userId,
        offer: data.offer,
      });
    });

    socket.on('signal:answer', (data: { targetUserId: string; answer: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('signal:answer', {
        fromUserId: socket.data.userId,
        answer: data.answer,
      });
    });

    socket.on('signal:ice_candidate', (data: { targetUserId: string; candidate: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('signal:ice_candidate', {
        fromUserId: socket.data.userId,
        candidate: data.candidate,
      });
    });

    // End call
    socket.on('call:leave', () => {
      if (socket.data.roomId) {
        socket.to(`call:${socket.data.roomId}`).emit('call:user_left', { userId: socket.data.userId });
        socket.leave(`call:${socket.data.roomId}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.roomId) {
        socket.to(`call:${socket.data.roomId}`).emit('call:user_left', { userId: socket.data.userId });
      }
    });
  });

  httpServer.listen(PORT, () => console.log(`media-service signaling on ${PORT}`));
  return io;
}
