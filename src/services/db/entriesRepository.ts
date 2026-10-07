import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalDateKey } from '@/types/dates';
import type { MoodEntryRow, NewMoodEntry } from '@/types/db';

/**
 * Mood entries. Interface only in the foundation; implemented with the Home/Dashboard features.
 * Local-date ranges use each row's stored offset (D20): narrow with
 * utcSearchWindowForLocalRange(), then filter exactly by local date.
 */
export interface EntriesRepository {
  /** Inserts an entry and its diary prompt in one transaction (prompt copies the entry's timestamp and offset). */
  insertEntryWithPrompt(entry: NewMoodEntry, prompt: string): Promise<{ entryId: number; promptId: number }>;
  /** Entries whose write-time local date is within [start, end], oldest first. */
  getEntriesInLocalRange(start: LocalDateKey, end: LocalDateKey): Promise<MoodEntryRow[]>;
  /** Distinct write-time local dates, newest first (streak). Must not read every row into JS. */
  getDistinctLocalDates(since?: LocalDateKey): Promise<LocalDateKey[]>;
  /** Latest write-time local date, for the D46 upper bound; null when there are no entries. */
  getLatestLocalDate(): Promise<LocalDateKey | null>;
  /** Deletes one entry; its prompt goes with it via ON DELETE CASCADE (D18). */
  deleteEntry(id: number): Promise<void>;
  /** Delete-all (D30). */
  deleteAllEntries(): Promise<void>;
}

export type CreateEntriesRepository = (db: SQLiteDatabase) => EntriesRepository;
