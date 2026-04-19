import { useEffect } from 'react';
import { toast } from '@matrimonial/ui';
import { config } from '../env';

/** Map tRPC error codes to user-friendly Chinese messages */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '没有权限',
  NOT_FOUND: '内容不存在',
  BAD_REQUEST: '请求参数错误',
  TIMEOUT: '请求超时，请重试',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试',
  INTERNAL_SERVER_ERROR: '服务器开小差了',
  NETWORK_ERROR: '网络连接失败',
};

/** In-memory breadcrumb trail — last 30 user interactions for session replay context */
const breadcrumbs: Array<{ action: string; screen?: string; ts: number }> = [];

export function addBreadcrumb(action: string, screen?: string) {
  breadcrumbs.push({ action, screen, ts: Date.now() });
  if (breadcrumbs.length > 30) breadcrumbs.shift();
}

function sendErrorEvent(type: string, message: string, stack?: string, fatal = false) {
  fetch(config.analyticsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [{
        event: 'error_boundary',
        props: {
          error_type: type,
          error: message.slice(0, 300),
          stack: stack?.slice(0, 500),
          fatal,
          breadcrumbs: breadcrumbs.slice(-10),
        },
        timestamp: Date.now(),
        session_id: 'error',
      }],
    }),
  }).catch(() => {});
}

export function useGlobalErrorHandler() {
  useEffect(() => {
    const RNErrorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: Error, fatal?: boolean) => void; setGlobalHandler: (h: (e: Error, fatal?: boolean) => void) => void } }).ErrorUtils;
    if (RNErrorUtils) {
      const prev = RNErrorUtils.getGlobalHandler();
      RNErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        sendErrorEvent('js_error', error.message, error.stack, isFatal);
        console.error(JSON.stringify({
          type: 'fatal_error',
          fatal: isFatal,
          message: error.message,
          stack: error.stack?.slice(0, 500),
        }));
        prev(error, isFatal);
      });
    }
  }, []);
}
