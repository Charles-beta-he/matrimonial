import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@matrimonial/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@matrimonial/shared/schemas': path.resolve(__dirname, '../../packages/shared/src/schemas/index.ts'),
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    globals: true,
  },
});
