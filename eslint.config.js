// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const jestGlobals = {
  jest: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  afterAll: 'readonly',
  afterEach: 'readonly',
};

/**
 * Machine-checked conventions (CLAUDE.md → Navigation, Storage and security).
 * Flat config replaces a rule's options wholesale, so the override for the Anthropic service and
 * tests re-lists the navigation restrictions without the `readApiKey` one.
 */
const navigationPaths = [
  {
    name: 'expo-router',
    importNames: ['Tabs'],
    message: "Import Tabs from 'expo-router/js-tabs' (D35); expo-router's Tabs export is deprecated.",
  },
  { name: 'expo-router/tabs', message: "Import Tabs from 'expo-router/js-tabs' (D35)." },
  {
    name: 'expo-router/unstable-native-tabs',
    message: 'No NativeTabs (D35): hidden native tabs cannot be navigated to.',
  },
];
const navigationPatterns = [
  {
    group: ['@react-navigation/*'],
    message: "Use expo-router/drawer, expo-router/js-tabs or expo-router/react-navigation instead (D35).",
  },
];
const readApiKeyPattern = {
  group: ['@/services/storage/secureKeyStore', '**/secureKeyStore'],
  importNames: ['readApiKey'],
  message: 'Only the Anthropic service (src/services/anthropic/) may read the API key.',
};
const noNativeTabsSyntax = [
  'error',
  {
    selector: "ImportSpecifier[imported.name='NativeTabs']",
    message: 'No NativeTabs (D35): hidden native tabs cannot be navigated to.',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*', 'ios/*', 'android/*'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: navigationPaths, patterns: [...navigationPatterns, readApiKeyPattern] },
      ],
      'no-restricted-syntax': noNativeTabsSyntax,
    },
  },
  {
    files: ['src/services/anthropic/**/*.{ts,tsx}', 'src/tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: navigationPaths, patterns: navigationPatterns }],
    },
  },
  {
    // eslint-config-expo 57 defines no Jest globals.
    files: ['src/tests/**/*.{ts,tsx}'],
    languageOptions: { globals: jestGlobals },
    // jest.mock() factories must use require().
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
