import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';

import { initialSettingsState } from '@/state/settingsSlice';
import { makeStore } from '@/state/store';
import { buildPaperTheme } from '@/themes/paperTheme';
import type { ThemeName } from '@/types/settings';
import { ThemedPaperProvider } from '@/ui/components/ThemedPaperProvider/ThemedPaperProvider';
import { useAppTheme } from '@/themes/useAppTheme';

function Probe() {
  const theme = useAppTheme();
  return <Text>{theme.colors.primaryContainer}</Text>;
}

async function renderWithTheme(theme?: ThemeName) {
  const store = makeStore({ settings: theme ? { ...initialSettingsState, theme } : initialSettingsState });
  await render(
    <ReduxProvider store={store}>
      <ThemedPaperProvider>
        <Probe />
      </ThemedPaperProvider>
    </ReduxProvider>,
  );
}

describe('ThemedPaperProvider', () => {
  it('applies the default lavender theme', async () => {
    await renderWithTheme();
    expect(initialSettingsState.theme).toBe('lavender');
    expect(screen.getByText(buildPaperTheme('lavender').colors.primaryContainer)).toBeTruthy();
  });

  it.each(['sage', 'water'] as const)('applies the %s theme from Redux settings', async (name) => {
    await renderWithTheme(name);
    expect(screen.getByText(buildPaperTheme(name).colors.primaryContainer)).toBeTruthy();
    expect(buildPaperTheme(name).colors.primaryContainer).not.toBe(buildPaperTheme('lavender').colors.primaryContainer);
  });
});

describe('ThemedPaperProvider live font scale', () => {
  // Wired by usePaperTheme: a font-scale change flips the theme's re-layout marker.
  function FontProbe() {
    const theme = useAppTheme();
    return <Text>{`style:${String((theme.fonts.default as { fontStyle?: string }).fontStyle)}`}</Text>;
  }

  it('adds the re-layout fontStyle after a font-scale change without remounting', async () => {
    const store = makeStore({ settings: initialSettingsState });
    await render(
      <ReduxProvider store={store}>
        <ThemedPaperProvider>
          <FontProbe />
        </ThemedPaperProvider>
      </ReduxProvider>,
    );
    expect(screen.getByText('style:undefined')).toBeTruthy();
    await act(async () => {
      Dimensions.set({ window: { ...Dimensions.get('window'), fontScale: 1.8 }, screen: { ...Dimensions.get('screen'), fontScale: 1.8 } });
    });
    expect(screen.getByText('style:normal')).toBeTruthy();
    await act(async () => {
      Dimensions.set({ window: { ...Dimensions.get('window'), fontScale: 1 }, screen: { ...Dimensions.get('screen'), fontScale: 1 } });
    });
  });
});
