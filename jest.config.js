/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/tests/__tests__/**/*.test.{ts,tsx}'],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-paper|react-native-mmkv|react-native-nitro-modules|@tanstack|@reduxjs|immer|reselect|redux|react-redux|standard-navigation))',
  ],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/tests/**', '!src/types/**'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/services/notifications/',
    '/src/services/anthropic/',
    '/src/ui/screens/ChatScreen/',
    '/src/state/chatSlice',
    '/src/app/chat.tsx',
  ],
  coverageThreshold: {
    global: { lines: 65, statements: 65, functions: 65, branches: 50 },
  },
};
