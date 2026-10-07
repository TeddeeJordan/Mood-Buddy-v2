import { selectThemeName } from '@/state/settingsSlice';
import { useAppSelector } from '@/state/hooks';
import { buildPaperTheme } from '@/themes/paperTheme';

/** Paper theme for the persisted theme name. Must be called inside the Redux Provider. */
export function usePaperTheme() {
  const themeName = useAppSelector(selectThemeName);
  // Rebuilt only when the theme name changes (React Compiler memoizes this).
  return buildPaperTheme(themeName);
}
