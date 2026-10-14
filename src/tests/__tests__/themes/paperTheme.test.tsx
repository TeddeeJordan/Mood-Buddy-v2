import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import { buildPaperTheme, textRelayoutStyle, withTextRelayoutPass } from '@/themes/paperTheme';
import { PALETTES } from '@/themes/palettes';
import { useAppTheme } from '@/themes/useAppTheme';
import { THEME_NAMES } from '@/types/settings';

describe('buildPaperTheme', () => {
  it.each(THEME_NAMES)('%s builds on MD3LightTheme with option C mapping', (name) => {
    const theme = buildPaperTheme(name);
    expect(theme.dark).toBe(false);
    expect(theme.version).toBe(3);
    expect(theme.fonts).toBe(MD3LightTheme.fonts);
    expect(theme.colors.primary).toBe(PALETTES[name].primary.text);
    expect(theme.colors.background).toBe(PALETTES[name].background);
    expect(theme.colors.error).toBe(MD3LightTheme.colors.error);
  });

  it('produces different themes per palette', () => {
    expect(buildPaperTheme('sage').colors.primary).not.toBe(buildPaperTheme('water').colors.primary);
  });
});

describe('useAppTheme', () => {
  function Probe() {
    const theme = useAppTheme();
    return <Text>{`${theme.colors.primary}|${theme.colors.stressBar}`}</Text>;
  }

  it('reads the app theme from PaperProvider', async () => {
    await render(
      <PaperProvider theme={buildPaperTheme('water')}>
        <Probe />
      </PaperProvider>,
    );
    expect(screen.getByText(`${PALETTES.water.primary.text}|#DA6060`)).toBeTruthy();
  });
});

describe('withTextRelayoutPass', () => {
  const base = buildPaperTheme('lavender');

  it('returns the very same theme object on an even pass', () => {
    expect(withTextRelayoutPass(base, 0)).toBe(base);
    expect(withTextRelayoutPass(base, 2)).toBe(base);
  });

  it('adds fontStyle normal to every font, including default, on an odd pass', () => {
    const odd = withTextRelayoutPass(base, 1);
    expect(odd).not.toBe(base);
    const keys = Object.keys(base.fonts);
    expect(keys).toContain('default');
    expect(Object.keys(odd.fonts)).toEqual(keys);
    for (const key of keys) {
      expect((odd.fonts as Record<string, { fontStyle?: string }>)[key].fontStyle).toBe('normal');
    }
  });

  it('keeps the other font properties and the colours unchanged on an odd pass', () => {
    const odd = withTextRelayoutPass(base, 3);
    expect(odd.colors).toBe(base.colors);
    expect(odd.fonts.titleLarge).toMatchObject({ ...base.fonts.titleLarge, fontStyle: 'normal' });
  });

  it('does not mutate the base theme', () => {
    withTextRelayoutPass(base, 1);
    expect((base.fonts.default as { fontStyle?: string }).fontStyle).toBeUndefined();
  });
});

describe('textRelayoutStyle', () => {
  const base = buildPaperTheme('lavender');

  it('is undefined on an even pass and normal on an odd pass', () => {
    expect(textRelayoutStyle(withTextRelayoutPass(base, 0))).toEqual({ fontStyle: undefined });
    expect(textRelayoutStyle(withTextRelayoutPass(base, 1))).toEqual({ fontStyle: 'normal' });
  });
});
