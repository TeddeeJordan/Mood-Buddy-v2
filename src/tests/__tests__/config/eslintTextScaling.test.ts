/**
 * @jest-environment node
 */
import { execFileSync } from 'node:child_process';

/**
 * Fixture test for the text-scaling `no-restricted-syntax` rules in eslint.config.js (CLAUDE.md →
 * Text scaling): Paper's HelperText/TextInput/Checkbox.Item/Menu.Item default to a 1.5 cap, so the
 * lint must force an explicit uncapped prop.
 *
 * ESLint loads the flat config with a dynamic import, which Jest's sandbox rejects, so all fixtures
 * are linted in one child Node process (the project's real config, text from stdin-style
 * `lintText`) and the messages come back as JSON.
 */
const FIXTURES: Record<string, string> = {
  helperTextMissing: '<HelperText type="error" visible>x</HelperText>',
  textInputMissing: '<TextInput label="x" />',
  helperTextOk: '<HelperText type="info" visible maxFontSizeMultiplier={0}>x</HelperText>',
  textInputOk: '<TextInput label="x" maxFontSizeMultiplier={0} />',
  undefinedValue: '<TextInput label="x" maxFontSizeMultiplier={undefined} />',
  checkboxMissing: '<Checkbox.Item label="x" status="checked" />',
  checkboxOk: '<Checkbox.Item label="x" status="checked" labelMaxFontSizeMultiplier={0} />',
  menuMissing: '<Menu.Item title="x" />',
  menuOk: '<Menu.Item title="x" titleMaxFontSizeMultiplier={0} />',
};

const SCRIPT = `
  const { ESLint } = require('eslint');
  const path = require('path');
  const fixtures = JSON.parse(process.argv[1]);
  (async () => {
    const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: path.join(process.cwd(), 'eslint.config.js') });
    const out = {};
    for (const [name, jsx] of Object.entries(fixtures)) {
      const code = "import { HelperText, TextInput, Checkbox, Menu } from 'react-native-paper';\\nexport function Fixture() {\\n  return (<>" + jsx + "</>);\\n}\\n";
      const [result] = await eslint.lintText(code, { filePath: path.join(process.cwd(), 'src/ui/components/Fixture/Fixture.tsx') });
      out[name] = result.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
    }
    process.stdout.write(JSON.stringify(out));
  })();
`;

let found: Record<string, string[]>;

beforeAll(() => {
  const stdout = execFileSync(process.execPath, ['-e', SCRIPT, JSON.stringify(FIXTURES)], {
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
    encoding: 'utf8',
  });
  found = JSON.parse(stdout) as Record<string, string[]>;
}, 120000);

describe('text scaling lint rules', () => {
  it('flags a HelperText without maxFontSizeMultiplier', () => {
    expect(found.helperTextMissing.some((m) => m.includes('maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}'))).toBe(true);
  });

  it('flags a TextInput without maxFontSizeMultiplier', () => {
    expect(found.textInputMissing.some((m) => m.includes('maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}'))).toBe(true);
  });

  it('accepts HelperText and TextInput with an explicit value', () => {
    expect(found.helperTextOk).toEqual([]);
    expect(found.textInputOk).toEqual([]);
  });

  it('flags maxFontSizeMultiplier={undefined} (it keeps the library cap)', () => {
    expect(found.undefinedValue.some((m) => m.includes('instead of undefined'))).toBe(true);
  });

  it('flags Checkbox.Item without labelMaxFontSizeMultiplier, and accepts it with one', () => {
    expect(found.checkboxMissing.some((m) => m.includes('labelMaxFontSizeMultiplier'))).toBe(true);
    expect(found.checkboxOk).toEqual([]);
  });

  it('flags Menu.Item without titleMaxFontSizeMultiplier, and accepts it with one', () => {
    expect(found.menuMissing.some((m) => m.includes('titleMaxFontSizeMultiplier'))).toBe(true);
    expect(found.menuOk).toEqual([]);
  });
});
