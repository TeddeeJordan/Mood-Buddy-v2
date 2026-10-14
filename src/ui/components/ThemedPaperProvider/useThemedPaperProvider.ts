import { useFontScaleRelayoutPass } from '@/hooks/useFontScaleRelayoutPass';
import { selectThemeName } from '@/state/settingsSlice';
import { useAppSelector } from '@/state/hooks';
import { buildPaperTheme, withTextRelayoutPass } from '@/themes/paperTheme';

/**
 * Paper theme for the persisted theme name. Must be called inside the Redux Provider.
 * A live system text-size change flips the theme's re-layout marker (`withTextRelayoutPass`) so
 * every Paper text re-measures at the new scale; nothing is remounted, so drafts survive.
 */
export function usePaperTheme() {
  const themeName = useAppSelector(selectThemeName);
  const relayoutPass = useFontScaleRelayoutPass();
  // Rebuilt only when the theme name or the re-layout pass changes (React Compiler memoizes this).
  return withTextRelayoutPass(buildPaperTheme(themeName), relayoutPass);
}
