import * as SplashScreen from 'expo-splash-screen';
import { useRef } from 'react';

import { useAppBootstrap } from '@/hooks/useAppBootstrap';

/** Bootstrap readiness plus a layout handler that hides the native splash exactly once. */
export function useAppReadyGate() {
  const ready = useAppBootstrap();
  const hidden = useRef(false);

  const onLayout = () => {
    if (hidden.current) return;
    hidden.current = true;
    SplashScreen.hide();
  };

  return { ready, onLayout };
}
