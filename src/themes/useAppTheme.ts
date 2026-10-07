import { useTheme } from 'react-native-paper';

import type { AppTheme } from './paperTheme';

/** The current Paper theme, typed with the app's extra colour tokens. */
export function useAppTheme(): AppTheme {
  return useTheme<AppTheme>();
}
