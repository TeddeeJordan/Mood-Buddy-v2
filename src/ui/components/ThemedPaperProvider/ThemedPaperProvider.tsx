import { PaperProvider } from 'react-native-paper';

import type { ThemedPaperProviderProps } from './ThemedPaperProvider.props';
import { usePaperTheme } from './useThemedPaperProvider';

/** PaperProvider themed from the persisted theme name. Must render inside the Redux Provider. */
export function ThemedPaperProvider({ children }: ThemedPaperProviderProps) {
  const theme = usePaperTheme();
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
