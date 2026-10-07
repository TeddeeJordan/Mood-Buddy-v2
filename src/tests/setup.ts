// Global Jest setup. Package mocks live in src/tests/__mocks__ (found via `roots: ['<rootDir>/src']`).
import 'react-native-gesture-handler/jestSetup';

// Reanimated 4 needs Worklets; neither can initialise its native side under Jest, so use the
// mocks both packages ship. (The drawer uses Reanimated.)
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
