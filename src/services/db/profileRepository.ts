import type { ProfileRow, SqlDatabase } from '@/types/db';

/** The single profile row (id = 1, seeded by schema v1). */
export interface ProfileRepository {
  /** The profile row; an empty profile if the seeded row is missing. */
  getProfile(): Promise<ProfileRow>;
  /** Writes bio and photo file name (`photo_uri`, see ProfileRow). Upserts row 1. */
  saveProfile(patch: Pick<ProfileRow, 'bio' | 'photo_uri'>): Promise<void>;
  /** Delete-all: empty bio, no photo (D30). The photo files are removed by `deleteAllProfilePhotos`. */
  resetProfile(): Promise<void>;
}

export type CreateProfileRepository = (db: SqlDatabase) => ProfileRepository;

export const EMPTY_PROFILE: ProfileRow = { id: 1, bio: '', photo_uri: null };

/** Raw row as SQLite returns it; mapped defensively instead of cast. */
interface RawProfileRow {
  bio: unknown;
  photo_uri: unknown;
}

export function mapProfileRow(row: RawProfileRow | null): ProfileRow {
  if (row === null) return EMPTY_PROFILE;
  return {
    id: 1,
    bio: typeof row.bio === 'string' ? row.bio : '',
    photo_uri: typeof row.photo_uri === 'string' && row.photo_uri !== '' ? row.photo_uri : null,
  };
}

export const createProfileRepository: CreateProfileRepository = (db) => ({
  async getProfile() {
    const row = await db.getFirstAsync<RawProfileRow>('SELECT bio, photo_uri FROM profile WHERE id = ?', 1);
    return mapProfileRow(row);
  },
  async saveProfile({ bio, photo_uri }) {
    await db.runAsync(
      `INSERT INTO profile (id, bio, photo_uri) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET bio = excluded.bio, photo_uri = excluded.photo_uri`,
      1,
      bio,
      photo_uri,
    );
  },
  async resetProfile() {
    await db.runAsync("UPDATE profile SET bio = '', photo_uri = NULL WHERE id = ?", 1);
  },
});
