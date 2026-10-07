import { SCHEMA_VERSION } from '@/constants/database';
import { configureConnection, migrateDbIfNeeded, MIGRATIONS, readUserVersion } from '@/services/db/migrations';
import { SCHEMA_V1 } from '@/services/db/schema.v1';
import { purgeCutoffIso, toLocalDateKey, utcSearchWindowForLocalRange } from '@/utils/dates';
import { NodeSqliteAdapter } from '@/tests/helpers/nodeSqliteAdapter';

let db: NodeSqliteAdapter;

beforeEach(() => {
  db = new NodeSqliteAdapter();
});

afterEach(() => db.close());

const ENTRY_SQL = `INSERT INTO mood_entries (timestamp, tz_offset_min, mood, stress, anxiety) VALUES (?, ?, ?, ?, ?)`;

async function insertEntry(values: [string, number, number, number, number] = ['2026-10-07T15:30:00.000Z', 540, 3, 4, 2]) {
  return (await db.runAsync(ENTRY_SQL, ...values)).lastInsertRowId;
}

async function insertPrompt(entryId: number | null) {
  return db.runAsync(
    'INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, ?, ?)',
    entryId,
    '2026-10-07T15:30:00.000Z',
    540,
    'Right now I feel Neutral.',
  );
}

describe('migration list', () => {
  it('is ordered and ends at SCHEMA_VERSION', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(versions[versions.length - 1]).toBe(SCHEMA_VERSION);
  });
});

describe('migrateDbIfNeeded', () => {
  it('turns foreign keys on first, outside any transaction', async () => {
    await migrateDbIfNeeded(db);
    expect(db.log[0]).toEqual({ sql: 'PRAGMA foreign_keys = ON', inTransaction: false });
    expect(await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });

  it('migrates v0 → v1: tables, indexes, profile seed, user_version', async () => {
    expect(await readUserVersion(db)).toBe(0);
    await migrateDbIfNeeded(db);
    expect(await readUserVersion(db)).toBe(1);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(['diary_prompts', 'mood_entries', 'profile']);

    const indexes = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
    );
    expect(indexes.map((i) => i.name)).toEqual([
      'idx_diary_prompts_entry_id',
      'idx_diary_prompts_timestamp',
      'idx_mood_entries_timestamp',
    ]);

    expect(await db.getAllAsync('SELECT * FROM profile')).toEqual([{ id: 1, bio: '', photo_uri: null }]);

    // The schema change and the version bump run inside one transaction.
    const bump = db.log.find((l) => l.sql === 'PRAGMA user_version = 1');
    expect(bump?.inTransaction).toBe(true);
  });

  it('is a no-op on a second run', async () => {
    await migrateDbIfNeeded(db);
    const before = db.log.length;
    await migrateDbIfNeeded(db);
    const second = db.log.slice(before).map((l) => l.sql);
    expect(second).toEqual(['PRAGMA foreign_keys = ON', 'PRAGMA journal_mode = WAL', 'PRAGMA user_version']);
    expect(await db.getAllAsync('SELECT * FROM profile')).toHaveLength(1);
  });

  it('refuses a database newer than the app', async () => {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrateDbIfNeeded(db)).rejects.toThrow(/newer than this app supports/);
  });

  it('rolls back a migration that fails part-way and leaves user_version untouched', async () => {
    // v1 creates mood_entries, diary_prompts and their indexes first, then fails on `profile`.
    await db.execAsync('CREATE TABLE profile (id INTEGER)');
    await expect(migrateDbIfNeeded(db)).rejects.toThrow(/profile already exists/);
    expect(db.log.some((l) => l.sql === 'ROLLBACK')).toBe(true);
    expect(await readUserVersion(db)).toBe(0);
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name IN ('mood_entries', 'diary_prompts', 'idx_mood_entries_timestamp')",
    );
    expect(tables).toEqual([]);
  });
});

describe('readUserVersion', () => {
  it('falls back to 0 when the PRAGMA query returns no row', async () => {
    await expect(readUserVersion({ getFirstAsync: async () => null })).resolves.toBe(0);
  });

  it('returns the stored user_version when a row is present', async () => {
    await expect(readUserVersion({ getFirstAsync: async () => ({ user_version: 7 }) as never })).resolves.toBe(7);
  });
});

describe('foreign keys depend on configureConnection', () => {
  it('a fresh connection starts with foreign keys OFF, like expo-sqlite, until configureConnection', async () => {
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 0 });
    await configureConnection(db);
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });

  it('without the PRAGMA, a delete does not cascade and a dangling entry_id is accepted', async () => {
    await db.execAsync(SCHEMA_V1); // schema only, no configureConnection
    const entryId = await insertEntry();
    await insertPrompt(entryId);
    await db.runAsync('DELETE FROM mood_entries WHERE id = ?', entryId);
    expect(await db.getAllAsync('SELECT * FROM diary_prompts')).toHaveLength(1);
    await expect(insertPrompt(9999)).resolves.toBeDefined();
  });
});

describe('schema v1 constraints', () => {
  beforeEach(() => migrateDbIfNeeded(db));

  it('cascades: deleting an entry deletes its prompt', async () => {
    const entryId = await insertEntry();
    await insertPrompt(entryId);
    await db.runAsync('DELETE FROM mood_entries WHERE id = ?', entryId);
    expect(await db.getAllAsync('SELECT * FROM diary_prompts')).toEqual([]);
  });

  it('enforces NOT NULL entry_id and the foreign key', async () => {
    await expect(insertPrompt(null)).rejects.toThrow(/NOT NULL/);
    await expect(insertPrompt(9999)).rejects.toThrow(/FOREIGN KEY/);
  });

  it.each([
    ['mood 6', ['2026-10-07T00:00:00.000Z', 0, 6, 1, 1]],
    ['stress 0', ['2026-10-07T00:00:00.000Z', 0, 1, 0, 1]],
    ['anxiety 6', ['2026-10-07T00:00:00.000Z', 0, 1, 1, 6]],
    ['offset 900', ['2026-10-07T00:00:00.000Z', 900, 3, 3, 3]],
    ['offset -721', ['2026-10-07T00:00:00.000Z', -721, 3, 3, 3]],
  ] as const)('CHECK rejects %s', async (_label, values) => {
    await expect(insertEntry([...values])).rejects.toThrow(/CHECK/);
  });

  it('accepts the extreme real offsets', async () => {
    await expect(insertEntry(['2026-10-07T00:00:00.000Z', 840, 1, 1, 1])).resolves.toBeGreaterThan(0);
    await expect(insertEntry(['2026-10-07T00:00:00.000Z', -720, 5, 5, 5])).resolves.toBeGreaterThan(0);
  });

  it.each([
    ['no Z', '2026-10-07T00:00:00.000'],
    ['explicit offset', '2026-10-07T09:00:00.000+09:00'],
    ['no milliseconds', '2026-10-07T00:00:00Z'],
    ['lower-case z', '2026-10-07T00:00:00.000z'],
    ['space separator', '2026-10-07 00:00:00.000Z'],
    ['date only', '2026-10-07'],
  ])('CHECK rejects a %s timestamp', async (_label, ts) => {
    await expect(insertEntry([ts, 0, 3, 3, 3])).rejects.toThrow(/CHECK/);
    const entryId = await insertEntry();
    await expect(
      db.runAsync('INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, 0, ?)', entryId, ts, 'p'),
    ).rejects.toThrow(/CHECK/);
  });

  it('accepts timestamps in the form the app writes (Date#toISOString)', async () => {
    const window = utcSearchWindowForLocalRange(toLocalDateKey('2026-10-07'), toLocalDateKey('2026-10-08'));
    for (const ts of [new Date().toISOString(), purgeCutoffIso(), window.fromIso, window.toIsoExclusive]) {
      const entryId = await insertEntry([ts, 0, 3, 3, 3]);
      await expect(
        db.runAsync('INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, 0, ?)', entryId, ts, 'p'),
      ).resolves.toBeDefined();
    }
  });

  it.each([
    ['trailing character after Z', '2026-10-07T00:00:00.000ZZ'],
    ['leading whitespace', ' 2026-10-07T00:00:00.000Z'],
    ['trailing whitespace', '2026-10-07T00:00:00.000Z '],
    ['four fractional digits', '2026-10-07T00:00:00.0000Z'],
    ['two fractional digits', '2026-10-07T00:00:00.00Z'],
    ['comma decimal separator', '2026-10-07T00:00:00,000Z'],
    ['lower-case t', '2026-10-07t00:00:00.000Z'],
    ['non-digit in a digit position', '2026-1O-07T00:00:00.000Z'],
    ['expanded (6-digit) year from Date#toISOString overflow', new Date(8.64e15).toISOString()],
    ['negative expanded year', new Date(-8.64e15).toISOString()],
    ['empty string', ''],
  ])('CHECK rejects %s', async (_label, ts) => {
    await expect(insertEntry([ts, 0, 3, 3, 3])).rejects.toThrow(/CHECK/);
  });

  it.each([
    ['year 0000 (Date#toISOString minimum 4-digit year)', '0000-01-01T00:00:00.000Z'],
    ['year 9999 (maximum 4-digit year)', '9999-12-31T23:59:59.999Z'],
    ['the Unix epoch', new Date(0).toISOString()],
    ['a leap day', new Date(Date.UTC(2028, 1, 29, 12)).toISOString()],
  ])('CHECK accepts %s', async (_label, ts) => {
    expect(new Date(Date.parse(ts)).toISOString()).toBe(ts);
    const entryId = await insertEntry([ts, 0, 3, 3, 3]);
    await expect(
      db.runAsync('INSERT INTO diary_prompts (entry_id, timestamp, tz_offset_min, prompt) VALUES (?, ?, 0, ?)', entryId, ts, 'p'),
    ).resolves.toBeDefined();
  });

  it('allows only profile id 1', async () => {
    await expect(db.runAsync("INSERT INTO profile (id, bio) VALUES (2, '')")).rejects.toThrow(/CHECK/);
  });

  it('derives the write-time local date with the minutes modifier', async () => {
    await insertEntry(['2026-10-07T15:30:00.000Z', 540, 3, 3, 3]);
    await insertEntry(['2026-10-08T03:00:00.000Z', -300, 3, 3, 3]);
    const rows = await db.getAllAsync<{ d: string }>(
      "SELECT date(timestamp, tz_offset_min || ' minutes') AS d FROM mood_entries ORDER BY id",
    );
    expect(rows.map((r) => r.d)).toEqual(['2026-10-08', '2026-10-07']);
  });
});
