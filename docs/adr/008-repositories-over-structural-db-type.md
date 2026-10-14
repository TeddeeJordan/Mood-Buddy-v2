# 008. Repositories are factories over a structural `SqlDatabase` type

**Status:** Accepted. Spec: §2.7 (v2 data model), §3.7 (Data retention), D3, D20 (related: [ADR 002](002-state-and-storage-stack.md), [ADR 004](004-time-model.md)).

## Context

The Home check-in is the first feature to write to SQLite. It must insert an entry and its diary prompt atomically, prune old prompts, and be testable against a real database without the native `expo-sqlite` module. Typing repositories against `SQLiteDatabase` would tie tests to the native class.

## Decision

- `createEntriesRepository(db)` and `createPromptsRepository(db)` are factory functions. They take a `SqlDatabase` (`src/types/db.ts`): the subset of `SQLiteDatabase` they use (`runAsync`, `getAllAsync`, `getFirstAsync`, `withTransactionAsync`). Every value is a bound parameter.
- `useEntriesRepository()` (`src/hooks/useRepositories.ts`) binds the factory to `useSQLiteContext()`. It is the seam screen tests mock.
- `insertEntryWithPrompt` runs the entry insert, the prompt insert and the 90-day prompt purge in one `withTransactionAsync` transaction, never `withExclusiveTransactionAsync` (its separate connection has foreign keys off).
- `createProfileRepository(db)` (`getProfile`, `saveProfile` upsert of row 1, `resetProfile`) follows the same pattern. The migration of the profile repository from `SQLiteDatabase` to `SqlDatabase`, which this ADR first deferred, is complete with the Profile feature.
- Row scores are validated (`isScaleValue`) when mapped, not cast.
- No schema change; `SCHEMA_VERSION` stays 1.

## Consequences

- Repository tests can run on `NodeSqliteAdapter` and the same SQL runs in the app.
- The structural type must be kept in step with the methods the repositories call.
- Screens never see SQL; hooks use TanStack Query and invalidate the key family after writes.
- Prompt purging currently happens only on insert; purge at app start or foreground is deferred to the Diary milestone.
