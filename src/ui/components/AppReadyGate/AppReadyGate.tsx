import { View } from 'react-native';

import { styles, type AppReadyGateProps } from './AppReadyGate.props';
import { useAppReadyGate } from './useAppReadyGate';

/**
 * Renders nothing (native splash stays up) until startup work is done, then hides the splash
 * on the first layout of the app. Must sit inside SQLiteProvider, which itself renders null
 * until `onInit` has finished (expo-sqlite 57.0.4 hooks.tsx:239-240).
 */
export function AppReadyGate({ children }: AppReadyGateProps) {
  const { ready, onLayout } = useAppReadyGate();
  if (!ready) return null;
  return (
    <View style={styles.root} onLayout={onLayout} testID="app-ready-root">
      {children}
    </View>
  );
}
