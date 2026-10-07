import { DatabaseSync } from 'node:sqlite';

import type { MigrationDatabase } from '@/services/db/migrations';

type Param = string | number | null;

/**
 * Wraps node:sqlite's DatabaseSync in the async subset of expo-sqlite's SQLiteDatabase
 * that the migrations (and tests) use. Records every statement so tests can assert order.
 */
export class NodeSqliteAdapter implements MigrationDatabase {
  readonly db: DatabaseSync;
  readonly log: { sql: string; inTransaction: boolean }[] = [];

  constructor(path = ':memory:') {
    // node:sqlite turns foreign keys ON by default; real SQLite / expo-sqlite start with them OFF.
    // Match expo-sqlite so only `configureConnection`'s PRAGMA can turn them on.
    this.db = new DatabaseSync(path, { enableForeignKeyConstraints: false });
  }

  private record(sql: string) {
    this.log.push({ sql: sql.trim(), inTransaction: this.db.isTransaction });
  }

  async execAsync(source: string): Promise<void> {
    this.record(source);
    this.db.exec(source);
  }

  async getFirstAsync<T>(source: string, ...params: Param[]): Promise<T | null> {
    this.record(source);
    return (this.db.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: Param[]): Promise<T[]> {
    this.record(source);
    return this.db.prepare(source).all(...params) as T[];
  }

  async runAsync(source: string, ...params: Param[]): Promise<{ lastInsertRowId: number; changes: number }> {
    this.record(source);
    const r = this.db.prepare(source).run(...params);
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  /** Same semantics as expo-sqlite: BEGIN / COMMIT, ROLLBACK and rethrow on error. */
  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await this.execAsync('BEGIN');
    try {
      await task();
      await this.execAsync('COMMIT');
    } catch (e) {
      await this.execAsync('ROLLBACK');
      throw e;
    }
  }

  close(): void {
    this.db.close();
  }
}
