import { useCallback, useEffect, useRef } from 'react';
import type { AnalyticsEvent } from '@matrimonial/shared';
import { config } from '../env';
import { addBreadcrumb } from './useErrorHandler';

// Event queue for batching
const eventQueue: Array<AnalyticsEvent & { timestamp: number; user_id?: string; session_id: string }> = [];
let sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const FLUSH_INTERVAL = 10_000; // 10 seconds
const BATCH_SIZE = 20;

// Auto-flush timer
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, BATCH_SIZE);
  try {
    await fetch(config.analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    }).catch(() => {
      // Re-queue on failure (with limit)
      if (eventQueue.length < 200) eventQueue.push(...batch);
    });
  } catch { /* silent fail for analytics */ }
}

function startAutoFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
}

export function useAnalytics() {
  const userIdRef = useRef<string | undefined>();

  const track = useCallback(<E extends AnalyticsEvent>(event: E['event'], props: Extract<AnalyticsEvent, { event: E['event'] }>['props']) => {
    addBreadcrumb(event, (props as any)?.screen_name);
    eventQueue.push({
      event,
      props,
      timestamp: Date.now(),
      user_id: userIdRef.current,
      session_id: sessionId,
    } as any);

    startAutoFlush();

    // Flush immediately if batch is full
    if (eventQueue.length >= BATCH_SIZE) flushEvents();
  }, []);

  const setUserId = useCallback((id: string) => {
    userIdRef.current = id;
  }, []);

  const clearUser = useCallback(() => {
    userIdRef.current = undefined;
  }, []);

  const startSession = useCallback(() => {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  return { track, setUserId, clearUser, startSession };
}

// Screen view tracking hook
export function useScreenTracking(screenName: string) {
  const { track } = useAnalytics();
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    track('screen_view', { screen_name: screenName });
  }, [screenName, track]);

  return { track, mountedAt };
}
