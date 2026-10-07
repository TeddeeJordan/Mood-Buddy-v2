import { buildPaperTheme } from '@/themes/paperTheme';
import { contrastRatio, MIN_TEXT_CONTRAST, MIN_UI_CONTRAST, relativeLuminance } from '@/themes/contrast';
import { METRIC_COLORS, ON_IDENTITY, PALETTES, SPLASH_BACKGROUND } from '@/themes/palettes';
import { THEME_NAMES } from '@/types/settings';

const appJson = require('../../../../app.json') as {
  expo: { plugins: (string | [string, Record<string, unknown>])[] };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('contrast helper', () => {
  it('matches WCAG reference values', () => {
    expect(round2(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1);
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#C47ED0', '#1C1B1F')).toBe(contrastRatio('#1C1B1F', '#C47ED0'));
  });

  it('rejects malformed colours', () => {
    expect(() => relativeLuminance('#FFF')).toThrow(RangeError);
    expect(() => relativeLuminance('red')).toThrow(RangeError);
  });

  it('reproduces the plan figures', () => {
    expect(round2(contrastRatio(ON_IDENTITY, '#C47ED0'))).toBe(5.91);
    expect(round2(contrastRatio(ON_IDENTITY, '#8DC48D'))).toBe(8.49);
    expect(round2(contrastRatio(ON_IDENTITY, '#4AA8C8'))).toBe(6.3);
    expect(round2(contrastRatio(ON_IDENTITY, '#E07B7B'))).toBe(5.95);
    expect(round2(contrastRatio(ON_IDENTITY, '#7BA8D4'))).toBe(6.85);
    expect(round2(contrastRatio('#4D4952', '#EAEAF5'))).toBe(7.36);
    expect(round2(contrastRatio('#4D4952', '#EEEEF8'))).toBe(7.62);
  });
});

/**
 * Paper defaults some tokens as `rgb(r, g, b)` / `rgba(r, g, b, 1)`; normalise opaque ones to
 * `#RRGGBB` for the contrast helper (anything translucent is left as is, so the helper throws).
 */
function toHex(colour: string): string {
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*1)?\)$/.exec(colour);
  if (!rgb) return colour;
  return `#${rgb.slice(1).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`;
}

describe.each(THEME_NAMES)('%s theme (option C)', (name) => {
  const { colors: c } = buildPaperTheme(name);

  /**
   * Every opaque surface the theme exposes. `elevation.level0` is transparent (it shows the
   * surface underneath), so it is covered by `background` and `surface`.
   */
  const surfaces: [string, string][] = [
    ['background', c.background],
    ['surface', c.surface],
    ['surfaceVariant', c.surfaceVariant],
    ['elevation.level1', c.elevation.level1],
    ['elevation.level2', c.elevation.level2],
    ['elevation.level3', c.elevation.level3],
    ['elevation.level4', c.elevation.level4],
    ['elevation.level5', c.elevation.level5],
  ];

  /** Text tokens that may sit directly on any surface. */
  const surfaceText: [string, string][] = [
    ['onBackground', c.onBackground],
    ['onSurface', c.onSurface],
    ['onSurfaceVariant', c.onSurfaceVariant],
    ['primary', c.primary],
    ['secondary', c.secondary],
    ['tertiary', c.tertiary],
    ['error', c.error],
    ['stressText', c.stressText],
    ['anxietyText', c.anxietyText],
  ];

  /** Non-text UI tokens (outlines, indicators, chart bars) that may sit on any surface. */
  const surfaceUi: [string, string][] = [
    ['outline', c.outline],
    ['primaryUi', c.primaryUi],
    ['secondaryUi', c.secondaryUi],
    ['stressBar', c.stressBar],
    ['anxietyBar', c.anxietyBar],
  ];

  const textPairs: [string, string, string][] = [
    ['onPrimary/primary', c.onPrimary, c.primary],
    ['onSecondary/secondary', c.onSecondary, c.secondary],
    ['onTertiary/tertiary', c.onTertiary, c.tertiary],
    ['onError/error', c.onError, c.error],
    ['onPrimaryContainer/primaryContainer', c.onPrimaryContainer, c.primaryContainer],
    ['onSecondaryContainer/secondaryContainer', c.onSecondaryContainer, c.secondaryContainer],
    ['onTertiaryContainer/tertiaryContainer', c.onTertiaryContainer, c.tertiaryContainer],
    ['onErrorContainer/errorContainer', c.onErrorContainer, c.errorContainer],
    ['inverseOnSurface/inverseSurface', c.inverseOnSurface, c.inverseSurface],
    ['inversePrimary/inverseSurface', c.inversePrimary, c.inverseSurface],
    ...surfaces.flatMap(([bgName, bg]) =>
      surfaceText.map(([fgName, fg]): [string, string, string] => [`${fgName} on ${bgName}`, fg, bg]),
    ),
  ];

  it.each(textPairs)('text pair %s ≥ 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(toHex(fg), toHex(bg))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  const uiPairs: [string, string, string][] = surfaces.flatMap(([bgName, bg]) =>
    surfaceUi.map(([fgName, fg]): [string, string, string] => [`${fgName} on ${bgName}`, fg, bg]),
  );

  it.each(uiPairs)('UI pair %s ≥ 3:1', (_label, fg, bg) => {
    expect(contrastRatio(toHex(fg), toHex(bg))).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
  });

  it('keeps elevation.level0 transparent and every other surface opaque #RRGGBB', () => {
    expect(c.elevation.level0).toBe('transparent');
    for (const [, bg] of surfaces) {
      expect(bg).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('keeps the owner identity colours as containers', () => {
    expect(c.primaryContainer).toBe(PALETTES[name].primary.identity);
    expect(c.secondaryContainer).toBe(PALETTES[name].secondary.identity);
    expect(c.onPrimaryContainer).toBe(ON_IDENTITY);
  });
});

describe('shared tokens', () => {
  it('dark text is readable on the metric identity colours', () => {
    expect(contrastRatio(ON_IDENTITY, METRIC_COLORS.stress.identity)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(ON_IDENTITY, METRIC_COLORS.anxiety.identity)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('SPLASH_BACKGROUND matches the native splash colour in app.json', () => {
    const splash = appJson.expo.plugins.find(
      (p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[0] === 'expo-splash-screen',
    );
    expect(splash?.[1].backgroundColor).toBe(SPLASH_BACKGROUND);
  });
});
