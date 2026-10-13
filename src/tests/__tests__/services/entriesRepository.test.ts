import { createEntriesRepository, mapEntryRow } from '@/services/db/entriesRepository';
import { migrateDbIfNeeded } from '@/services/db/migrations';
import { NodeSqliteAdapter } from '@/tests/helpers/nodeSqliteAdapter';
import type { LocalDateKey } from '@/types/dates';
import type { NewMoodEntry, SqlDatabase } from '@/types/db';
import { purgeCutoffIso } from '@/utils/dates';

const k = (s: string) => s as LocalDateKey;

let db: NodeSqliteAdapter;

beforeEach(async () => {
  db = new NodeSqliteAdapter();
  await migrateDbIfNeeded(db);
});

afterEach(() => db.close());

function entry(overrides: Partial<NewMoodEntry> = {}): NewMoodEntry {
  return {
    timestamp: '2026-10-07T15:30:00.000Z',
    tz_offset_min: 540,
    mood: 3,
    stress: 4,
    stress_note_1: 'work',
    stress_note_2: null,
    stress_note_3: null,
    anxiety: 2,
    anxiety_note_1: null,
    anxiety_note_2: null,
    anxiety_note_3: null,
    ...overrides,
  };
}

const NOW = new Date('2026-10-08T12:00:00.000Z');

async function count(table: string) {
  return (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n;
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

describe('insertEntryWithPrompt', () => {
  it('writes the entry and a linked prompt with the same timestamp and offset', async () => {
    const repo = createEntriesRepository(db);
    const { entryId, promptId } = await repo.insertEntryWithPrompt(entry(), 'hello', NOW);

    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM mood_entries WHERE id = ?', entryId);
    expect(row).toMatchObject({ mood: 3, stress: 4, stress_note_1: 'work', stress_note_2: null, anxiety: 2 });

    const prompt = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM diary_prompts WHERE id = ?', promptId);
    expect(prompt).toMatchObject({
      entry_id: entryId,
      timestamp: '2026-10-07T15:30:00.000Z',
      tz_offset_min: 540,
      prompt: 'hello',
    });
  });

  it('purges prompts older than 90 days and keeps the boundary', async () => {
    const cutoff = purgeCutoffIso(NOW);
    const older = new Date(new Date(cutoff).getTime() - 1).toISOString();
    await seedPrompt(older);
    await seedPrompt(cutoff);

    await createEntriesRepository(db).insertEntryWithPrompt(entry(), 'new', NOW);

    const timestamps = (await db.getAllAsync<{ timestamp: string }>('SELECT timestamp FROM diary_prompts')).map(
      (r) => r.timestamp,
    );
    expect(timestamps).not.toContain(older);
    expect(timestamps).toContain(cutoff);
    expect(timestamps).toContain('2026-10-07T15:30:00.000Z');
  });

  it('rolls the entry back when the prompt insert fails (no orphan entry)', async () => {
    const failing: SqlDatabase = {
      runAsync: (source, ...params) =>
        source.includes('INSERT INTO diary_prompts')
          ? Promise.reject(new Error('disk full'))
          : db.runAsync(source, ...params),
      getAllAsync: (source, ...params) => db.getAllAsync(source, ...params),
      getFirstAsync: (source, ...params) => db.getFirstAsync(source, ...params),
      withTransactionAsync: (task) => db.withTransactionAsync(task),
    };
    await expect(createEntriesRepository(failing).insertEntryWithPrompt(entry(), 'x', NOW)).rejects.toThrow(
      'disk full',
    );
    expect(await count('mood_entries')).toBe(0);
    expect(await count('diary_prompts')).toBe(0);
  });
});

describe('getEntriesInLocalRange', () => {
  it('uses the stored offset: +840 just after local midnight belongs to the next local day', async () => {
    // 10:30Z + 14h = 2026-10-08 00:30 local
    const repo = createEntriesRepository(db);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-07T10:30:00.000Z', tz_offset_min: 840 }), 'p', NOW);
    expect(await repo.getEntriesInLocalRange(k('2026-10-08'), k('2026-10-08'))).toHaveLength(1);
    expect(await repo.getEntriesInLocalRange(k('2026-10-07'), k('2026-10-07'))).toHaveLength(0);
  });

  it('uses the stored offset: -720 stays on the previous local day', async () => {
    // 11:30Z - 12h = 2026-10-07 23:30 local
    const repo = createEntriesRepository(db);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-08T11:30:00.000Z', tz_offset_min: -720 }), 'p', NOW);
    expect(await repo.getEntriesInLocalRange(k('2026-10-07'), k('2026-10-07'))).toHaveLength(1);
    expect(await repo.getEntriesInLocalRange(k('2026-10-08'), k('2026-10-08'))).toHaveLength(0);
  });

  it('swaps the bounds when start is after end and returns oldest first', async () => {
    const repo = createEntriesRepository(db);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-07T09:00:00.000Z', mood: 5 }), 'b', NOW);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-05T09:00:00.000Z', mood: 1 }), 'a', NOW);
    const rows = await repo.getEntriesInLocalRange(k('2026-10-08'), k('2026-10-04'));
    expect(rows.map((r) => r.mood)).toEqual([1, 5]);
  });
});

describe('getDistinctLocalDates / getLatestLocalDate', () => {
  async function seed() {
    const repo = createEntriesRepository(db);
    for (const timestamp of [
      '2026-10-01T09:00:00.000Z',
      '2026-10-05T09:00:00.000Z',
      '2026-10-05T10:00:00.000Z',
      '2026-10-07T09:00:00.000Z',
    ]) {
      await repo.insertEntryWithPrompt(entry({ timestamp }), 'p', NOW);
    }
    return repo;
  }

  it('returns distinct local dates newest first', async () => {
    const repo = await seed();
    expect(await repo.getDistinctLocalDates()).toEqual(['2026-10-07', '2026-10-05', '2026-10-01']);
  });

  it('limits to dates on or after since', async () => {
    const repo = await seed();
    expect(await repo.getDistinctLocalDates(k('2026-10-05'))).toEqual(['2026-10-07', '2026-10-05']);
  });

  it('uses each row offset for the date', async () => {
    const repo = createEntriesRepository(db);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-07T10:30:00.000Z', tz_offset_min: 840 }), 'p', NOW);
    expect(await repo.getDistinctLocalDates()).toEqual(['2026-10-08']);
    expect(await repo.getLatestLocalDate()).toBe('2026-10-08');
  });

  it('returns the latest local date', async () => {
    const repo = await seed();
    expect(await repo.getLatestLocalDate()).toBe('2026-10-07');
  });

  it('returns null for the latest date when there are no entries', async () => {
    expect(await createEntriesRepository(db).getLatestLocalDate()).toBeNull();
  });

  it('returns an empty list when there are no entries', async () => {
    expect(await createEntriesRepository(db).getDistinctLocalDates()).toEqual([]);
  });
});

describe('deletes', () => {
  it('deleteEntry removes the entry and cascades to its prompt only', async () => {
    const repo = createEntriesRepository(db);
    const a = await repo.insertEntryWithPrompt(entry(), 'a', NOW);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-07T16:00:00.000Z' }), 'b', NOW);
    await repo.deleteEntry(a.entryId);
    expect(await count('mood_entries')).toBe(1);
    expect(await db.getAllAsync<{ prompt: string }>('SELECT prompt FROM diary_prompts')).toEqual([{ prompt: 'b' }]);
  });

  it('deleteAllEntries removes every entry and prompt', async () => {
    const repo = createEntriesRepository(db);
    await repo.insertEntryWithPrompt(entry(), 'a', NOW);
    await repo.insertEntryWithPrompt(entry({ timestamp: '2026-10-07T16:00:00.000Z' }), 'b', NOW);
    await repo.deleteAllEntries();
    expect(await count('mood_entries')).toBe(0);
    expect(await count('diary_prompts')).toBe(0);
  });
});

describe('mapEntryRow', () => {
  const raw = {
    id: 7,
    timestamp: '2026-10-07T15:30:00.000Z',
    tz_offset_min: 0,
    mood: 3,
    stress: 4,
    stress_note_1: null,
    stress_note_2: null,
    stress_note_3: null,
    anxiety: 2,
    anxiety_note_1: null,
    anxiety_note_2: null,
    anxiety_note_3: null,
  };

  it('passes a valid row through', () => {
    expect(mapEntryRow(raw)).toEqual(raw);
  });

  it.each(['mood', 'stress', 'anxiety'] as const)('throws a RangeError for an invalid %s', (column) => {
    expect(() => mapEntryRow({ ...raw, [column]: 6 })).toThrow(RangeError);
    expect(() => mapEntryRow({ ...raw, [column]: 6 })).toThrow(`Invalid ${column} in mood_entries row 7`);
  });

  it('rejects non-integer scores', () => {
    expect(() => mapEntryRow({ ...raw, mood: 2.5 })).toThrow(RangeError);
  });
});
