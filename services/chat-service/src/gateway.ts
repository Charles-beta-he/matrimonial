import { Server } from 'socket.io';
import http from 'node:http';
import * as jose from 'jose';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';

const PORT = Number(process.env.PORT ?? 3002);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-me',
);

export function createGateway() {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      if (!payload.sub) return next(new Error('Invalid token: missing sub'));
      socket.data.userId = payload.sub as string;
      next();
    } catch (err) {
      console.error('[gateway] JWT verify failed:', (err as Error).message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit('presence:online', { userId });

    // Register handlers
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      io.emit('presence:offline', { userId });
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`chat-service listening on ${PORT}`);
  });

  return io;
}
