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
  },
};
