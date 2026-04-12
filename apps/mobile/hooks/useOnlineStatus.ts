import { useEffect, useState } from 'react';

/** Simple online-status hook (placeholder until WebSocket integration) */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // TODO: integrate with WebSocket heartbeat
    setIsOnline(true);
  }, []);

  return { isOnline };
}
