import { isScaleValue, type ScaleValue } from '@/constants/scales';
import type { LocalDateKey } from '@/types/dates';
import type { MoodEntryRow, NewMoodEntry, SqlDatabase } from '@/types/db';
import { purgeCutoffIso, utcSearchWindowForLocalRange } from '@/utils/dates';

/**
 * Mood entries. Local-date ranges use each row's stored offset (D20): narrow with
 * utcSearchWindowForLocalRange() on the indexed `timestamp`, then filter exactly by local date.
 */
export interface EntriesRepository {
  /**
   * Inserts an entry and its diary prompt in one transaction (prompt copies the entry's timestamp
   * and offset), then purges prompts older than the 90-day cutoff (D3, §3.7).
   */
  insertEntryWithPrompt(
    entry: NewMoodEntry,
    prompt: string,
    now?: Date,
  ): Promise<{ entryId: number; promptId: number }>;
  /** Entries whose write-time local date is within [start, end], oldest first. */
  getEntriesInLocalRange(start: LocalDateKey, end: LocalDateKey): Promise<MoodEntryRow[]>;
  /** Distinct write-time local dates, newest first (streak). Must not read every row into JS. */
  getDistinctLocalDates(since?: LocalDateKey): Promise<LocalDateKey[]>;
  /** Latest write-time local date, for the D46 upper bound; null when there are no entries. */
  getLatestLocalDate(): Promise<LocalDateKey | null>;
  /** Deletes one entry; its prompt goes with it via ON DELETE CASCADE (D18). */
  deleteEntry(id: number): Promise<void>;
  /** Delete-all (D30). Prompts go with their entries via ON DELETE CASCADE. */
  deleteAllEntries(): Promise<void>;
}

export type CreateEntriesRepository = (db: SqlDatabase) => EntriesRepository;

/** A row's write-time local date in SQL (D20). */
const LOCAL_DATE_SQL = "date(timestamp, tz_offset_min || ' minutes')";

const ENTRY_COLUMNS =
  'id, timestamp, tz_offset_min, mood, stress, stress_note_1, stress_note_2, stress_note_3, ' +
  'anxiety, anxiety_note_1, anxiety_note_2, anxiety_note_3';

/** Raw row as SQLite returns it (scores are plain numbers until validated). */
type RawEntryRow = Omit<MoodEntryRow, 'mood' | 'stress' | 'anxiety'> & {
  mood: number;
  stress: number;
  anxiety: number;
};

function toScaleValue(value: number, column: string, id: number): ScaleValue {
  if (!isScaleValue(value)) {
    // No user content in the message: only the column and row id.
    throw new RangeError(`Invalid ${column} in mood_entries row ${id}`);
  }
  return value;
}

/** Validates the score columns instead of casting (the schema CHECKs should make this unreachable). */
export function mapEntryRow(row: RawEntryRow): MoodEntryRow {
  return {
    ...row,
    mood: toScaleValue(row.mood, 'mood', row.id),
    stress: toScaleValue(row.stress, 'stress', row.id),
    anxiety: toScaleValue(row.anxiety, 'anxiety', row.id),
  };
}

export const createEntriesRepository: CreateEntriesRepository = (db) => ({
  async insertEntryWithPrompt(entry, prompt, now = new Date()) {
    let entryId = 0;
    let promptId = 0;
    // withTransactionAsync, never withExclusiveTransactionAsync (FKs are off on its connection).
    await db.withTransactionAsync(async () => {
      const inserted = await db.runAsync(
        `INSERT INTO mood_entries (timestamp, tz_offset_min, mood, stress, stress_note_1, stress_note_2,
           stress_note_3, anxiety, anxiety_note_1, anxiety_note_2, anxiety_note_3)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.timestamp,
        entry.tz_offset_min,
        entry.mood,
        entry.stress,
        entry.stress_note_1,
        entry.stress_note_2,
        entry.stress_note_3,
        entry.anxiety,
        entry.anxiety_note_1,
        entry.anxiety_note_2,
        entry.anxiety_note_3,
      );
      entryId = inserted.lastInsertRowId;
      const promptRow = await db.runAsync(
        'INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, ?, ?)',
        entryId,
        entry.timestamp,
        entry.tz_offset_min,
        prompt,
      );
      promptId = promptRow.lastInsertRowId;
      await db.runAsync('DELETE FROM diary_prompts WHERE timestamp < ?', purgeCutoffIso(now));
    });
    return { entryId, promptId };
  },

  async getEntriesInLocalRange(start, end) {
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    const { fromIso, toIsoExclusive } = utcSearchWindowForLocalRange(lo, hi);
    const rows = await db.getAllAsync<RawEntryRow>(
      `SELECT ${ENTRY_COLUMNS} FROM mood_entries
       WHERE timestamp >= ? AND timestamp < ?
         AND ${LOCAL_DATE_SQL} BETWEEN ? AND ?
       ORDER BY timestamp ASC, id ASC`,
      fromIso,
      toIsoExclusive,
      lo,
      hi,
    );
    return rows.map(mapEntryRow);
  },

  async getDistinctLocalDates(since) {
    const rows =
      since === undefined
        ? await db.getAllAsync<{ local_date: LocalDateKey }>(
            `SELECT DISTINCT ${LOCAL_DATE_SQL} AS local_date FROM mood_entries ORDER BY local_date DESC`,
          )
        : await db.getAllAsync<{ local_date: LocalDateKey }>(
            `SELECT DISTINCT ${LOCAL_DATE_SQL} AS local_date FROM mood_entries
             WHERE timestamp >= ? AND ${LOCAL_DATE_SQL} >= ?
             ORDER BY local_date DESC`,
            utcSearchWindowForLocalRange(since, since).fromIso,
            since,
          );
    return rows.map((r) => r.local_date);
  },

  async getLatestLocalDate() {
    const row = await db.getFirstAsync<{ local_date: LocalDateKey | null }>(
      `SELECT MAX(${LOCAL_DATE_SQL}) AS local_date FROM mood_entries`,
    );
    return row?.local_date ?? null;
  },

  async deleteEntry(id) {
    await db.runAsync('DELETE FROM mood_entries WHERE id = ?', id);
  },

  async deleteAllEntries() {
    await db.runAsync('DELETE FROM mood_entries');
  },
});
