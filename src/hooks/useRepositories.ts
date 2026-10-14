import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { createEntriesRepository, type EntriesRepository } from '@/services/db/entriesRepository';
import { createProfileRepository, type ProfileRepository } from '@/services/db/profileRepository';

/**
 * The entries repository bound to the SQLiteProvider connection. Must be used inside SQLiteProvider.
 * Also the seam screen tests mock (`jest.mock('@/hooks/useRepositories')`).
 */
export function useEntriesRepository(): EntriesRepository {
  const db = useSQLiteContext();
  return useMemo(() => createEntriesRepository(db), [db]);
}

/** The profile repository bound to the SQLiteProvider connection (same rules as above). */
export function useProfileRepository(): ProfileRepository {
  const db = useSQLiteContext();
  return useMemo(() => createProfileRepository(db), [db]);
}
