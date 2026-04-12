/** Structured JSON logger for production */
export const logger = {
  info(msg: string, data?: Record<string, any>) {
    console.log(JSON.stringify({ level: 'info', msg, ...data, timestamp: new Date().toISOString() }));
  },
  warn(msg: string, data?: Record<string, any>) {
    console.warn(JSON.stringify({ level: 'warn', msg, ...data, timestamp: new Date().toISOString() }));
  },
  error(msg: string, data?: Record<string, any>) {
    console.error(JSON.stringify({ level: 'error', msg, ...data, timestamp: new Date().toISOString() }));
  },
  request(method: string, path: string, status: number, duration: number, userId?: string) {
    console.log(JSON.stringify({
      level: 'info',
      type: 'http',
      method,
      path,
      status,
      duration_ms: duration,
      user_id: userId,
      timestamp: new Date().toISOString(),
    }));
  },
};
