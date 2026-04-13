import Constants from 'expo-constants';

type Environment = 'development' | 'preview' | 'staging' | 'production';

interface Config {
  env: Environment;
  apiUrl: string;
  chatUrl: string;
  mediaUrl: string;
  amapKey?: string;
  sentryDsn?: string;
  analyticsEndpoint: string;
  enableDebugLogs: boolean;
}

/** Railway-hosted preview backend (server only; chat-service not deployed here) */
const RAILWAY_API = 'https://matrimonialserver-production.up.railway.app';

/**
 * Some platforms (Vercel Project Settings) ship example/placeholder values
 * from a starter template that silently override our real config. Detect
 * and ignore them so we don't deploy with a dead backend.
 */
function sanitizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (
    lower.includes('example.com') ||
    lower.includes('placeholder') ||
    lower.includes('your-api') ||
    lower.includes('change-me')
  ) {
    return undefined;
  }
  return value;
}

const ENV_API = sanitizeUrl(process.env.EXPO_PUBLIC_API_URL);
const ENV_CHAT = sanitizeUrl(process.env.EXPO_PUBLIC_CHAT_URL);
const ENV_MEDIA = sanitizeUrl(process.env.EXPO_PUBLIC_MEDIA_URL);

const ENV_CONFIGS: Record<Environment, Config> = {
  development: {
    env: 'development',
    apiUrl: ENV_API ?? 'http://localhost:3000',
    chatUrl: ENV_CHAT ?? 'http://localhost:3002',
    mediaUrl: ENV_MEDIA ?? 'http://localhost:3003',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    analyticsEndpoint: (ENV_API ?? 'http://localhost:3000') + '/analytics/events',
    enableDebugLogs: true,
  },
  preview: {
    env: 'preview',
    apiUrl: ENV_API ?? RAILWAY_API,
    // chat-service not deployed to preview yet — socket will fail gracefully
    chatUrl: ENV_CHAT ?? RAILWAY_API.replace(/^https?/, 'wss'),
    mediaUrl: ENV_MEDIA ?? RAILWAY_API,
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (ENV_API ?? RAILWAY_API) + '/analytics/events',
    enableDebugLogs: true,
  },
  staging: {
    env: 'staging',
    apiUrl: ENV_API ?? 'https://api-staging.matrimonial.example.com',
    chatUrl: ENV_CHAT ?? 'wss://chat-staging.matrimonial.example.com',
    mediaUrl: ENV_MEDIA ?? 'wss://media-staging.matrimonial.example.com',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (ENV_API ?? 'https://api-staging.matrimonial.example.com') + '/analytics/events',
    enableDebugLogs: true,
  },
  production: {
    env: 'production',
    apiUrl: ENV_API ?? RAILWAY_API,
    chatUrl: ENV_CHAT ?? RAILWAY_API.replace(/^https?/, 'wss'),
    mediaUrl: ENV_MEDIA ?? RAILWAY_API,
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (ENV_API ?? RAILWAY_API) + '/analytics/events',
    enableDebugLogs: false,
  },
};

function resolveEnvironment(): Environment {
  // Read EXPO_PUBLIC_ENV at build time (Vercel sets it via vercel.json) OR
  // from expo config.extra (used in `expo start` with app.json extras).
  const buildTimeEnv = process.env.EXPO_PUBLIC_ENV as Environment | undefined;
  if (buildTimeEnv && buildTimeEnv in ENV_CONFIGS) return buildTimeEnv;

  const configExtraEnv = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENV as Environment | undefined;
  if (configExtraEnv && configExtraEnv in ENV_CONFIGS) return configExtraEnv;

  if (__DEV__) return 'development';
  return 'production';
}

export const config: Config = ENV_CONFIGS[resolveEnvironment()];

export const isDev = () => config.env === 'development';
export const isPreview = () => config.env === 'preview';
export const isStaging = () => config.env === 'staging';
export const isProd = () => config.env === 'production';
