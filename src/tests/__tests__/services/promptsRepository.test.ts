import { createEntriesRepository } from '@/services/db/entriesRepository';
import { migrateDbIfNeeded } from '@/services/db/migrations';
import { createPromptsRepository } from '@/services/db/promptsRepository';
import { NodeSqliteAdapter } from '@/tests/helpers/nodeSqliteAdapter';
import type { LocalDateKey } from '@/types/dates';
import type { NewMoodEntry } from '@/types/db';

const k = (s: string) => s as LocalDateKey;

let db: NodeSqliteAdapter;

beforeEach(async () => {
  db = new NodeSqliteAdapter();
  await migrateDbIfNeeded(db);
});

afterEach(() => db.close());

const NOW = new Date('2026-10-08T12:00:00.000Z');

function entry(timestamp: string, tz = 0): NewMoodEntry {
  return {
    timestamp,
    tz_offset_min: tz,
    mood: 3,
    stress: 1,
    stress_note_1: null,
    stress_note_2: null,
    stress_note_3: null,
    anxiety: 1,
    anxiety_note_1: null,
    anxiety_note_2: null,
    anxiety_note_3: null,
  };
}

async function seedPrompt(ts: string) {
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO mood_entries (timestamp, tz_offset_min, mood, stress, anxiety) VALUES (?, 0, 3, 1, 1)',
    ts,
  );
  await db.runAsync(
    'INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, 0, ?)',
    lastInsertRowId,
    ts,
    ts,
  );
}

describe('getPromptsInLocalRange', () => {
  it('returns prompts in range, newest first, and swaps reversed bounds', async () => {
    const entries = createEntriesRepository(db);
    await entries.insertEntryWithPrompt(entry('2026-10-05T09:00:00.000Z'), 'old', NOW);
    await entries.insertEntryWithPrompt(entry('2026-10-07T09:00:00.000Z'), 'new', NOW);
    await entries.insertEntryWithPrompt(entry('2026-10-01T09:00:00.000Z'), 'outside', NOW);
    const prompts = createPromptsRepository(db);

    expect((await prompts.getPromptsInLocalRange(k('2026-10-04'), k('2026-10-08'))).map((p) => p.prompt)).toEqual([
      'new',
      'old',
    ]);
    expect((await prompts.getPromptsInLocalRange(k('2026-10-08'), k('2026-10-04'))).map((p) => p.prompt)).toEqual([
      'new',
      'old',
    ]);
  });

  it('filters by the stored offset', async () => {
    const entries = createEntriesRepository(db);
    await entries.insertEntryWithPrompt(entry('2026-10-07T10:30:00.000Z', 840), 'p', NOW); // local 10-08
    const prompts = createPromptsRepository(db);
    expect(await prompts.getPromptsInLocalRange(k('2026-10-07'), k('2026-10-07'))).toHaveLength(0);
    expect(await prompts.getPromptsInLocalRange(k('2026-10-08'), k('2026-10-08'))).toHaveLength(1);
  });
});

describe('getPromptForEntry', () => {
  it('returns the prompt linked to the entry', async () => {
    const { entryId } = await createEntriesRepository(db).insertEntryWithPrompt(
      entry('2026-10-07T09:00:00.000Z'),
      'hi',
      NOW,
    );
    expect(await createPromptsRepository(db).getPromptForEntry(entryId)).toMatchObject({
      entry_id: entryId,
      prompt: 'hi',
    });
  });

  it('returns null when the entry has no prompt', async () => {
    expect(await createPromptsRepository(db).getPromptForEntry(999)).toBeNull();
  });
});

describe('purgeOlderThan', () => {
  it('deletes strictly older prompts and returns the count', async () => {
    const insert = seedPrompt;
    await insert('2026-01-01T00:00:00.000Z');
    await insert('2026-01-02T00:00:00.000Z');
    await insert('2026-06-01T00:00:00.000Z');
    const prompts = createPromptsRepository(db);
    expect(await prompts.purgeOlderThan('2026-06-01T00:00:00.000Z')).toBe(2);
    expect(await prompts.purgeOlderThan('2026-06-01T00:00:00.000Z')).toBe(0);
    expect(await db.getAllAsync('SELECT id FROM diary_prompts')).toHaveLength(1);
  });
});
