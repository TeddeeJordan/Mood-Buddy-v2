import { createMMKV } from 'react-native-mmkv';

import { MMKV_INSTANCE_ID } from '@/constants/storageKeys';

/**
 * The app's single MMKV instance (non-secret settings, flags and small caches; SPEC §2.8).
 * Under Jest, react-native-mmkv 4 returns its in-memory mock automatically.
 * Never store secrets here.
 */
export const storage = createMMKV({ id: MMKV_INSTANCE_ID });
