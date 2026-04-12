import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

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
  staging: {
    env: 'staging',
    apiUrl: 'https://api-staging.matrimonial.example.com',
    chatUrl: 'wss://chat-staging.matrimonial.example.com',
    mediaUrl: 'wss://media-staging.matrimonial.example.com',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: 'https://api-staging.matrimonial.example.com/analytics/events',
    enableDebugLogs: true,
  },
  production: {
    env: 'production',
    apiUrl: 'https://api.matrimonial.com',
    chatUrl: 'wss://im.matrimonial.com',
    mediaUrl: 'wss://media.matrimonial.com',
    amapKey: process.env.EXPO_PUBLIC_AMAP_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    analyticsEndpoint: 'https://api.matrimonial.com/analytics/events',
    enableDebugLogs: false,
  },
};

function resolveEnvironment(): Environment {
  // Expo release channel / runtime env / fallback
  const releaseChannel = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENV as Environment | undefined;
  if (releaseChannel === 'production' || releaseChannel === 'staging') return releaseChannel;
  if (__DEV__) return 'development';
  return 'production';
}

export const config: Config = ENV_CONFIGS[resolveEnvironment()];

export const isDev = () => config.env === 'development';
export const isStaging = () => config.env === 'staging';
export const isProd = () => config.env === 'production';
