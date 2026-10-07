import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import { buildPaperTheme } from '@/themes/paperTheme';
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
