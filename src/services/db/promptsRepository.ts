import type { LocalDateKey } from '@/types/dates';
import type { DiaryPromptRow, SqlDatabase } from '@/types/db';
import { utcSearchWindowForLocalRange } from '@/utils/dates';

/** Diary prompts. Written only by EntriesRepository.insertEntryWithPrompt (same transaction as the entry). */
export interface PromptsRepository {
  /** Prompts whose write-time local date is within [start, end], newest first. */
  getPromptsInLocalRange(start: LocalDateKey, end: LocalDateKey): Promise<DiaryPromptRow[]>;
  /** Prompt linked to an entry, if it hasn't been purged (CSV export). */
  getPromptForEntry(entryId: number): Promise<DiaryPromptRow | null>;
  /** Deletes prompts with timestamp < cutoffIso (purgeCutoffIso()); returns the number deleted (D3, §3.7). */
  purgeOlderThan(cutoffIso: string): Promise<number>;
}

export type CreatePromptsRepository = (db: SqlDatabase) => PromptsRepository;

const PROMPT_COLUMNS = 'id, entry_id, timestamp, tz_offset_min, prompt';

export const createPromptsRepository: CreatePromptsRepository = (db) => ({
  async getPromptsInLocalRange(start, end) {
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    const { fromIso, toIsoExclusive } = utcSearchWindowForLocalRange(lo, hi);
    return db.getAllAsync<DiaryPromptRow>(
      `SELECT ${PROMPT_COLUMNS} FROM diary_prompts
       WHERE timestamp >= ? AND timestamp < ?
         AND date(timestamp, tz_offset_min || ' minutes') BETWEEN ? AND ?
       ORDER BY timestamp DESC, id DESC`,
      fromIso,
      toIsoExclusive,
      lo,
      hi,
    );
  },

  async getPromptForEntry(entryId) {
    return db.getFirstAsync<DiaryPromptRow>(
      `SELECT ${PROMPT_COLUMNS} FROM diary_prompts WHERE entry_id = ? ORDER BY id DESC LIMIT 1`,
      entryId,
    );
  },

  async purgeOlderThan(cutoffIso) {
    const result = await db.runAsync('DELETE FROM diary_prompts WHERE timestamp < ?', cutoffIso);
    return result.changes;
  },
});
