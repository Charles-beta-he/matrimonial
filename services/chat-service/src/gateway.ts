import { Server } from 'socket.io';
import http from 'node:http';
import * as jose from 'jose';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedis, createRedisClient } from './lib/redis.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';

const PORT = Number(process.env.PORT ?? 3002);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-me',
);

/** Pub/sub channel for cross-instance presence broadcasts */
const PRESENCE_CHANNEL = 'chat:presence';

export function createGateway() {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── Redis adapter (cross-instance Socket.io room routing) ──────────────────
  const pubClient = getRedis();
  const subClient = createRedisClient();
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[gateway] Socket.io Redis adapter attached');
  } else {
    console.warn('[gateway] Redis unavailable — Socket.io running in single-instance mode');
  }

  // ── Redis pub/sub for presence events across instances ────────────────────
  const presenceSub = createRedisClient();
  if (presenceSub && pubClient) {
    presenceSub.subscribe(PRESENCE_CHANNEL).catch((err: Error) => {
      console.warn('[gateway] Failed to subscribe to presence channel:', err.message);
    });
    presenceSub.on('message', (_channel: string, message: string) => {
      try {
        const { event, data } = JSON.parse(message) as { event: string; data: unknown };
        io.emit(event, data);
      } catch {
        // Malformed message — ignore
      }
    });
  }

  /** Publish a presence event so ALL instances broadcast to their clients. */
  async function publishPresence(event: string, data: unknown): Promise<void> {
    if (pubClient) {
      try {
        await pubClient.publish(PRESENCE_CHANNEL, JSON.stringify({ event, data }));
        return;
      } catch {
        console.warn('[gateway] Redis publish failed, emitting locally only');
      }
    }
    // Fallback: local emit only (single-instance)
    io.emit(event, data);
  }

  // ── JWT middleware ──────────────────────────────────────────────────────────
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

  // ── Connection handling ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Broadcast online status via pub/sub so all instances notify their clients
    publishPresence('presence:online', { userId }).catch(() => {});

    // Register handlers
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      publishPresence('presence:offline', { userId }).catch(() => {});
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`chat-service listening on ${PORT}`);
  });

  return io;
}
