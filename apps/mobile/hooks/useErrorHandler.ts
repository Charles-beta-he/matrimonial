import { useEffect } from 'react';
import { toast } from '@matrimonial/ui';

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

export function useGlobalErrorHandler() {
  useEffect(() => {
    // Capture unhandled promise rejections
    const handler = (event: any) => {
      const error = event?.reason ?? event?.error;
      if (!error) return;

      const message = error?.data?.code
        ? ERROR_MESSAGES[error.data.code] ?? error.message
        : error?.message ?? '未知错误';

      toast.error(message);

      // Log for analytics
      console.error(JSON.stringify({
        type: 'unhandled_error',
        message: error?.message,
        stack: error?.stack?.slice(0, 500),
        timestamp: new Date().toISOString(),
      }));
    };

    // @ts-ignore — ErrorUtils exists in React Native
    if (typeof ErrorUtils !== 'undefined') {
      const prev = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error(JSON.stringify({
          type: 'fatal_error',
          fatal: isFatal,
          message: error.message,
          stack: error.stack?.slice(0, 500),
        }));
        prev(error, isFatal);
      });
    }

    return () => {};
  }, []);
}
