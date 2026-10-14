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
 * Machine-checked conventions (CLAUDE.md → Navigation, Storage and security, Text scaling).
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
  {
    // Paper 5.15.3 HelperText and TextInput default maxFontSizeMultiplier to 1.5, an unrecorded
    // sub-2.0 cap (CLAUDE.md → Text scaling). Matches the plain JSX names only, so a spread of
    // props still needs the explicit attribute.
    selector:
      "JSXOpeningElement[name.name=/^(HelperText|TextInput)$/]:not(:has(JSXAttribute[name.name='maxFontSizeMultiplier']))",
    message:
      'Pass maxFontSizeMultiplier={UNCAPPED_FONT_SCALE} (src/constants/textScaling.ts): Paper caps HelperText/TextInput at 1.5 by default, and undefined keeps that cap. A real cap needs an ADR.',
  },
  {
    // `undefined` falls back to the library default cap (e.g. Paper's 1.5); uncap with 0.
    selector:
      "JSXAttribute[name.name=/^(maxFontSizeMultiplier|labelMaxFontSizeMultiplier|titleMaxFontSizeMultiplier)$/] > JSXExpressionContainer > Identifier[name='undefined']",
    message:
      'Use UNCAPPED_FONT_SCALE (0, src/constants/textScaling.ts) instead of undefined: undefined keeps the library default cap. A real cap needs an ADR.',
  },
  {
    // Paper 5.15.3 Checkbox.Item defaults labelMaxFontSizeMultiplier to 1.5.
    selector:
      "JSXOpeningElement[name.object.name='Checkbox'][name.property.name='Item']:not(:has(JSXAttribute[name.name='labelMaxFontSizeMultiplier']))",
    message:
      'Pass labelMaxFontSizeMultiplier={UNCAPPED_FONT_SCALE} (src/constants/textScaling.ts): Paper caps Checkbox.Item labels at 1.5 by default. A real cap needs an ADR.',
  },
  {
    // Paper 5.15.3 Menu.Item defaults titleMaxFontSizeMultiplier to 1.5.
    selector:
      "JSXOpeningElement[name.object.name='Menu'][name.property.name='Item']:not(:has(JSXAttribute[name.name='titleMaxFontSizeMultiplier']))",
    message:
      'Pass titleMaxFontSizeMultiplier={UNCAPPED_FONT_SCALE} (src/constants/textScaling.ts): Paper caps Menu.Item titles at 1.5 by default. A real cap needs an ADR.',
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
