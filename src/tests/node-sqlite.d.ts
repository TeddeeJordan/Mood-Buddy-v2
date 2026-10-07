// Minimal types for Node's built-in `node:sqlite` (Node >= 22.13), used only by the test
// adapter. Declared locally so @types/node globals don't leak into app code.
declare module 'node:sqlite' {
  type SQLInputValue = null | number | bigint | string | Uint8Array;
  interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }
  class StatementSync {
    all(...params: SQLInputValue[]): unknown[];
    get(...params: SQLInputValue[]): unknown;
    run(...params: SQLInputValue[]): StatementResultingChanges;
  }
  class DatabaseSync {
    constructor(path: string, options?: { enableForeignKeyConstraints?: boolean });
    readonly isTransaction: boolean;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
