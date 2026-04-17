module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    // Handles both npm/yarn flat layout and pnpm's nested .pnpm layout.
    // The second alternative excludes .pnpm/ so it doesn't fire before the first.
    '(node_modules/.pnpm/[^/]+/node_modules/|node_modules/(?!\\.pnpm/))(?!((jest-)?react-native|@react-native(-community)?|@react-native/|expo(nent)?|@expo(nent)?/|@expo-google-fonts/|react-navigation|@react-navigation/|@sentry/react-native|native-base|react-native-svg|@matrimonial/))',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Resolve workspace packages from source (dist/ is not committed to git)
    '^@matrimonial/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@matrimonial/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@matrimonial/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@matrimonial/ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
    '^@matrimonial/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@matrimonial/api-client/(.*)$': '<rootDir>/../../packages/api-client/src/$1',
  },
};
