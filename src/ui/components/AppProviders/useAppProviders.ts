import { useState } from 'react';

import { createQueryClient } from '@/services/query/queryClient';
import { makeStore } from '@/state/store';

/** Created once per JS runtime: a stable identity for QueryClientProvider. */
export const queryClient = createQueryClient();

/** The Redux store, created once per mount (preloaded synchronously from MMKV). */
export function useAppStore() {
  const [store] = useState(makeStore);
  return store;
}

