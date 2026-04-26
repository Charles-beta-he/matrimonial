import type { Server } from 'socket.io';

/** Module-level singleton — set once by ConversationGateway on init. */
let _io: Server | null = null;

export function setIo(server: Server) {
  _io = server;
}

export function getIo(): Server | null {
  return _io;
}
