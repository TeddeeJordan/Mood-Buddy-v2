import { ANXIETY_SCALE, MOOD_SCALE, optionForValue, requiresNotes, STRESS_SCALE } from '@/constants/scales';
import type { NewMoodEntry } from '@/types/db';

/** Oxford-comma list: "a", "a and b", "a, b, and c" (§3.4). Blank items are dropped. */
export function formatList(items: readonly string[]): string {
  const filtered = items.map((s) => s.trim()).filter(Boolean);
  if (filtered.length <= 1) return filtered[0] ?? '';
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(', ')}, and ${filtered[filtered.length - 1]}`;
}

type PromptInput = Pick<
  NewMoodEntry,
  | 'mood'
  | 'stress'
  | 'anxiety'
  | 'stress_note_1'
  | 'stress_note_2'
  | 'stress_note_3'
  | 'anxiety_note_1'
  | 'anxiety_note_2'
  | 'anxiety_note_3'
>;

function notes(...values: (string | null)[]): string[] {
  return values.filter((v): v is string => v !== null);
}

/**
 * Diary prompt text (§3.4). Takes the entry as it will be stored, so it only ever sees visible,
 * trimmed notes (non-visible notes are already null). Labels only, never numbers. The stressor and
 * trigger sentences appear only at a stored value ≥ 4 and with at least one note.
 */
export function buildDiaryPrompt(entry: PromptInput): string {
  const moodLabel = optionForValue(MOOD_SCALE, entry.mood)?.label ?? '';
  const stressLabel = optionForValue(STRESS_SCALE, entry.stress)?.label ?? '';
  const anxietyLabel = optionForValue(ANXIETY_SCALE, entry.anxiety)?.label ?? '';

  const parts = [`Right now I feel ${moodLabel}.`, `My stress level is ${stressLabel}.`];
  const stressors = formatList(notes(entry.stress_note_1, entry.stress_note_2, entry.stress_note_3));
  if (requiresNotes(STRESS_SCALE, entry.stress) && stressors) {
    parts.push(`My main stressors right now are ${stressors}.`);
  }
  parts.push(`My anxiety level is ${anxietyLabel}.`);
  const triggers = formatList(notes(entry.anxiety_note_1, entry.anxiety_note_2, entry.anxiety_note_3));
  if (requiresNotes(ANXIETY_SCALE, entry.anxiety) && triggers) {
    parts.push(`My anxiety triggers are ${triggers}.`);
  }
  parts.push('I would like to talk about my feelings and get insight.');
  return parts.join(' ');
}
