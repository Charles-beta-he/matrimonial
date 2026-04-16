// Load env file based on NODE_ENV at module initialization
// Priority: .env.local > .env.{NODE_ENV} > .env
// Uses dotenv if available, otherwise relies on runtime env
try {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const dotenv = require('dotenv');
  const path = require('node:path');
  const fs = require('node:fs');

  // Load in order of increasing precedence
  const files = [
    `.env`,
    `.env.${nodeEnv}`,
    `.env.local`,
    `.env.${nodeEnv}.local`,
  ];

  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: true });
    }
  }
} catch {
  // dotenv not installed, skip
}

/** Centralized env access with typed defaults and production readiness checks */
export const env = {
  // Core
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') ?? true,
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',

  // Aliyun SMS
  ALIYUN_SMS_ACCESS_KEY_ID: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
  ALIYUN_SMS_ACCESS_KEY_SECRET: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
  ALIYUN_SMS_SIGN_NAME: process.env.ALIYUN_SMS_SIGN_NAME ?? '婚恋',
  ALIYUN_SMS_TEMPLATE_CODE: process.env.ALIYUN_SMS_TEMPLATE_CODE,

  // Aliyun OSS
  OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID,
  OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET,
  OSS_BUCKET: process.env.OSS_BUCKET ?? 'matrimonial-dev',
  OSS_REGION: process.env.OSS_REGION ?? 'oss-cn-hangzhou',
  OSS_ENDPOINT: process.env.OSS_ENDPOINT,
  CDN_DOMAIN: process.env.CDN_DOMAIN,

  // Aliyun Real-name verification
  ALIYUN_VERIFY_APP_CODE: process.env.ALIYUN_VERIFY_APP_CODE,

  // Aliyun Content audit
  ALIYUN_GREEN_ACCESS_KEY_ID: process.env.ALIYUN_GREEN_ACCESS_KEY_ID,
  ALIYUN_GREEN_ACCESS_KEY_SECRET: process.env.ALIYUN_GREEN_ACCESS_KEY_SECRET,

  // WeChat Pay
  WECHAT_APP_ID: process.env.WECHAT_APP_ID,
  WECHAT_MCH_ID: process.env.WECHAT_MCH_ID,
  WECHAT_API_V3_KEY: process.env.WECHAT_API_V3_KEY,
  WECHAT_PRIVATE_KEY: process.env.WECHAT_PRIVATE_KEY,
  WECHAT_CERT_SERIAL_NO: process.env.WECHAT_CERT_SERIAL_NO,
  WECHAT_NOTIFY_URL: process.env.WECHAT_NOTIFY_URL,

  // Alipay
  ALIPAY_APP_ID: process.env.ALIPAY_APP_ID,
  ALIPAY_PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY,
  ALIPAY_PUBLIC_KEY: process.env.ALIPAY_PUBLIC_KEY,
  ALIPAY_NOTIFY_URL: process.env.ALIPAY_NOTIFY_URL,

  // Apple IAP
  APPLE_SHARED_SECRET: process.env.APPLE_SHARED_SECRET,

  // JPush
  JPUSH_APP_KEY: process.env.JPUSH_APP_KEY,
  JPUSH_MASTER_SECRET: process.env.JPUSH_MASTER_SECRET,

  // Claude API (AI icebreaker)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',

  // LiveKit
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? 'devkey',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? 'secret',
  LIVEKIT_WS_URL: process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880',

  // Recommend service (Python)
  RECOMMEND_SERVICE_URL: process.env.RECOMMEND_SERVICE_URL ?? 'http://localhost:8000',

  // Server URL (for webhooks)
  SERVER_URL: process.env.SERVER_URL ?? 'http://localhost:3000',
};

/** Check if a third-party service is configured for production */
export function isConfigured(
  service:
    | 'sms'
    | 'oss'
    | 'verify'
    | 'audit'
    | 'wechatpay'
    | 'alipay'
    | 'jpush'
    | 'claude'
    | 'livekit'
    | 'apple_iap',
): boolean {
  switch (service) {
    case 'sms':
      return !!(env.ALIYUN_SMS_ACCESS_KEY_ID && env.ALIYUN_SMS_ACCESS_KEY_SECRET);
    case 'oss':
      return !!(env.OSS_ACCESS_KEY_ID && env.OSS_ACCESS_KEY_SECRET);
    case 'verify':
      return !!env.ALIYUN_VERIFY_APP_CODE;
    case 'audit':
      return !!(env.ALIYUN_GREEN_ACCESS_KEY_ID && env.ALIYUN_GREEN_ACCESS_KEY_SECRET);
    case 'wechatpay':
      return !!(env.WECHAT_APP_ID && env.WECHAT_MCH_ID && env.WECHAT_API_V3_KEY);
    case 'alipay':
      return !!(env.ALIPAY_APP_ID && env.ALIPAY_PRIVATE_KEY);
    case 'jpush':
      return !!(env.JPUSH_APP_KEY && env.JPUSH_MASTER_SECRET);
    case 'claude':
      return !!env.ANTHROPIC_API_KEY;
    case 'livekit':
      return !!(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
    case 'apple_iap':
      return !!env.APPLE_SHARED_SECRET;
  }
}

/** Assert required env vars on startup */
export function assertRequiredEnv() {
  const required = ['DATABASE_URL'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[env] Missing required: ${key}`);
      process.exit(1);
    }
  }
  // NOTE: NODE_ENV is widened to string here to allow custom values like 'preview'
  // beyond TypeScript's built-in 'development' | 'test' | 'production' literal type.
  const nodeEnv = env.NODE_ENV as string;
  if (
    (nodeEnv === 'production' || nodeEnv === 'preview') &&
    env.JWT_SECRET === 'dev-secret-change-me'
  ) {
    console.error('[env] JWT_SECRET must be set in ' + nodeEnv);
    process.exit(1);
  }
  if (env.NODE_ENV === 'production' && env.LIVEKIT_API_SECRET === 'secret') {
    console.error('[env] LIVEKIT_API_SECRET must be set in production (insecure default detected)');
    process.exit(1);
  }
  if (env.NODE_ENV === 'production' && env.LIVEKIT_API_KEY === 'devkey') {
    console.error('[env] LIVEKIT_API_KEY must be set in production (insecure default detected)');
    process.exit(1);
  }
  console.log('[env] validated, NODE_ENV=' + env.NODE_ENV);
}
