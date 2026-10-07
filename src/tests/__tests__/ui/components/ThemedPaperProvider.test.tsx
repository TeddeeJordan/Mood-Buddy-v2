import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
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
