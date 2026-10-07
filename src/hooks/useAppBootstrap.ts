import { useEffect, useState } from 'react';

import { BOOTSTRAP_TIMEOUT_MS } from '@/constants/limits';
import { runFirstInstallCleanup } from '@/services/storage/firstRun';
import { hasApiKey } from '@/services/storage/secureKeyStore';
import { setHasApiKey } from '@/state/settingsSlice';
import { useAppDispatch } from '@/state/hooks';
import type { AppDispatch } from '@/state/store';

/**
 * Startup work that must finish before the splash hides (SPEC §2.8, §3.11):
 * first-run keychain cleanup, THEN derive `hasApiKey` from SecureStore.
 * A SecureStore failure never blocks startup: the app proceeds with `hasApiKey = false`.
 * (MMKV settings are read synchronously when the store is created; the DB is ready because
 * this runs inside SQLiteProvider, which renders nothing until `onInit` finishes.)
 */
export async function bootstrapApp(dispatch: AppDispatch): Promise<void> {
  let keyPresent = false;
  try {
    await runFirstInstallCleanup();
    keyPresent = await hasApiKey();
  } catch {
    keyPresent = false;
  }
  dispatch(setHasApiKey(keyPresent));
}

/**
 * Returns true once bootstrapApp() has settled, or after BOOTSTRAP_TIMEOUT_MS, whichever is first.
 * Local state: one consumer (AppReadyGate).
 *
 * The timeout covers a SecureStore call that never settles (e.g. a keychain hang on a locked-device
 * cold launch), which would otherwise keep the splash up forever. On timeout the app proceeds with
 * `hasApiKey = false`. bootstrapApp keeps running and, if it settles later, dispatches the real
 * value (cleanup still runs before the key is read, so the order rule holds either way).
 */
export function useAppBootstrap(): boolean {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      dispatch(setHasApiKey(false));
      setReady(true);
    }, BOOTSTRAP_TIMEOUT_MS);
    void bootstrapApp(dispatch).finally(() => {
      clearTimeout(timer);
      if (active) setReady(true);
    });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dispatch]);

  return ready;
}
