import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { config } from '../env';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;

  connect: (token: string) => void;
  disconnect: () => void;
  isUserOnline: (userId: string) => boolean;
}

const CHAT_URL = config.chatUrl;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  onlineUsers: new Set(),

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(CHAT_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[socket] connected');
      set({ connected: true });
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
      set({ connected: false });
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] connect error:', err.message);
    });

    // Presence updates
    socket.on('presence:online', ({ userId }: { userId: string }) => {
      set((state) => {
        const updated = new Set(state.onlineUsers);
        updated.add(userId);
        return { onlineUsers: updated };
      });
    });

    socket.on('presence:offline', ({ userId }: { userId: string }) => {
      set((state) => {
        const updated = new Set(state.onlineUsers);
        updated.delete(userId);
        return { onlineUsers: updated };
      });
    });

    socket.on('presence:status', ({ statuses }: { statuses: Array<{ userId: string; online: boolean }> }) => {
      set((state) => {
        const updated = new Set(state.onlineUsers);
        for (const s of statuses) {
          if (s.online) updated.add(s.userId);
          else updated.delete(s.userId);
        }
        return { onlineUsers: updated };
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, onlineUsers: new Set() });
    }
  },

  isUserOnline: (userId) => get().onlineUsers.has(userId),
}));
