import { SCHEMA_VERSION } from '@/constants/database';

import { SCHEMA_V1 } from './schema.v1';

/** The subset of expo-sqlite's SQLiteDatabase that migrations use (a node:sqlite adapter implements it in tests). */
export interface MigrationDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface Migration {
  /** `PRAGMA user_version` after this migration. */
  version: number;
  up: string;
}

/** Ordered by version. The last entry must equal SCHEMA_VERSION. */
export const MIGRATIONS: readonly Migration[] = [{ version: 1, up: SCHEMA_V1 }];

/**
 * Per-connection setup. Must run first on EVERY connection, outside any transaction:
 * SQLite ignores `PRAGMA foreign_keys` inside a transaction, and without it ON DELETE CASCADE
 * does nothing. Note that expo-sqlite's `withExclusiveTransactionAsync` opens a separate
 * connection and begins the transaction before your task runs, so FK cascades do NOT fire
 * there; use `withTransactionAsync` for writes that rely on them.
 */
export async function configureConnection(db: Pick<MigrationDatabase, 'execAsync'>): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync('PRAGMA journal_mode = WAL');
}

export async function readUserVersion(db: Pick<MigrationDatabase, 'getFirstAsync'>): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * SQLiteProvider `onInit`. Defined at module scope so its identity is stable
 * (SQLiteProvider memo-compares `onInit`). Runs connection setup, then each pending
 * migration in its own transaction together with its `user_version` bump.
 */
export async function migrateDbIfNeeded(db: MigrationDatabase): Promise<void> {
  await configureConnection(db);
  const current = await readUserVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database schema v${current} is newer than this app supports (v${SCHEMA_VERSION}).`);
  }
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
