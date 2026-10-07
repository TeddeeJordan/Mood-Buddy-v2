import type { ScaleValue } from '@/constants/scales';

/** A row of `mood_entries` (SPEC §2.7). `timestamp` is UTC ISO 8601; `tz_offset_min` is minutes east of UTC at write time. */
export interface MoodEntryRow {
  id: number;
  timestamp: string;
  tz_offset_min: number;
  mood: ScaleValue;
  stress: ScaleValue;
  stress_note_1: string | null;
  stress_note_2: string | null;
  stress_note_3: string | null;
  anxiety: ScaleValue;
  anxiety_note_1: string | null;
  anxiety_note_2: string | null;
  anxiety_note_3: string | null;
}

export type NewMoodEntry = Omit<MoodEntryRow, 'id'>;

/** A row of `diary_prompts`. Deleted with its entry via ON DELETE CASCADE (D18). */
export interface DiaryPromptRow {
  id: number;
  entry_id: number;
  timestamp: string;
  tz_offset_min: number;
  prompt: string;
}

export interface ProfileRow {
  id: 1;
  bio: string;
  photo_uri: string | null;
}
