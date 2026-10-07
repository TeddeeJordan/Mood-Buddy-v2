import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalDateKey } from '@/types/dates';
import type { DiaryPromptRow } from '@/types/db';

/** Diary prompts. Interface only in the foundation; implemented with the Diary feature. */
export interface PromptsRepository {
  /** Prompts whose write-time local date is within [start, end], newest first. */
  getPromptsInLocalRange(start: LocalDateKey, end: LocalDateKey): Promise<DiaryPromptRow[]>;
  /** Prompt linked to an entry, if it hasn't been purged (CSV export). */
  getPromptForEntry(entryId: number): Promise<DiaryPromptRow | null>;
  /** Deletes prompts with timestamp < cutoffIso (purgeCutoffIso()); returns the number deleted (D3, §3.7). */
  purgeOlderThan(cutoffIso: string): Promise<number>;
}

export type CreatePromptsRepository = (db: SQLiteDatabase) => PromptsRepository;
