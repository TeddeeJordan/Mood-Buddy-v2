import type { SQLiteDatabase } from 'expo-sqlite';

import type { ProfileRow } from '@/types/db';

/** The single profile row (id = 1, seeded by schema v1). Interface only in the foundation. */
export interface ProfileRepository {
  getProfile(): Promise<ProfileRow>;
  saveProfile(patch: Pick<ProfileRow, 'bio' | 'photo_uri'>): Promise<void>;
  /** Delete-all: empty bio, no photo (D30). */
  resetProfile(): Promise<void>;
}

export type CreateProfileRepository = (db: SQLiteDatabase) => ProfileRepository;
