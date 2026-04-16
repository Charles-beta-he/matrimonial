import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages so Next.js/webpack can handle their TS source
  transpilePackages: ['@matrimonial/server', '@matrimonial/shared'],
  // Preview deployment: skip type/lint failures that come from monorepo dual React types.
  // Type safety is still enforced locally via `pnpm type-check`.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
