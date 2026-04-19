import { useSocketStore } from '../stores/useSocketStore';

/** Returns real-time online status from Socket.IO presence events */
export function useOnlineStatus(userId?: string) {
  const isOnline = useSocketStore((state) =>
    userId ? state.isUserOnline(userId) : state.connected,
  );
  return { isOnline };
}
