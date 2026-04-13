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

const ENV_CONFIGS: Record<Environment, Config> = {
  development: {
    env: 'development',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL ?? 'http://localhost:3002',
    mediaUrl: process.env.EXPO_PUBLIC_MEDIA_URL ?? 'http://localhost:3003',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    analyticsEndpoint: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/analytics/events',
    enableDebugLogs: true,
  },
  preview: {
    env: 'preview',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? RAILWAY_API,
    // chat-service not deployed to preview yet — socket will fail gracefully
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL ?? RAILWAY_API.replace(/^https?/, 'wss'),
    mediaUrl: process.env.EXPO_PUBLIC_MEDIA_URL ?? RAILWAY_API,
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (process.env.EXPO_PUBLIC_API_URL ?? RAILWAY_API) + '/analytics/events',
    enableDebugLogs: true,
  },
  staging: {
    env: 'staging',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api-staging.matrimonial.example.com',
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL ?? 'wss://chat-staging.matrimonial.example.com',
    mediaUrl: process.env.EXPO_PUBLIC_MEDIA_URL ?? 'wss://media-staging.matrimonial.example.com',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (process.env.EXPO_PUBLIC_API_URL ?? 'https://api-staging.matrimonial.example.com') + '/analytics/events',
    enableDebugLogs: true,
  },
  production: {
    env: 'production',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? RAILWAY_API,
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL ?? RAILWAY_API.replace(/^https?/, 'wss'),
    mediaUrl: process.env.EXPO_PUBLIC_MEDIA_URL ?? RAILWAY_API,
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: (process.env.EXPO_PUBLIC_API_URL ?? RAILWAY_API) + '/analytics/events',
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
