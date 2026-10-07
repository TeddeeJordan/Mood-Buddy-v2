/**
 * Where Mood Buddy keeps persistent data, and the no-backup rule for it (SPEC D49, ADR 006).
 *
 * - SQLite uses expo-sqlite's default directory and MMKV its default root. Don't pass
 *   `directory` to `SQLiteProvider`/`openDatabase*` or `path` to `createMMKV`: the defaults are
 *   what the backup exclusion covers.
 * - New persistent files (e.g. the profile photo) go under the document directory
 *   (`IOS_BACKUP_EXCLUDED_DIRECTORIES`). Temporary files (e.g. export CSVs) go in the cache
 *   directory, which neither OS backs up.
 * - Android: `android.allowBackup: false` in app.json; expo-secure-store's data-extraction rules
 *   (`configureAndroidBackup: true`) limit any OEM device-to-device transfer to shared preferences.
 * - iOS: the local `modules/no-backup` module marks these directories excluded from backup at
 *   every launch (`modules/no-backup/ios/BackupExclusion.swift` must list the same ones).
 */

/** Default storage directories of the installed libraries (verified in their native source). */
export const DEFAULT_DATA_DIRECTORIES = {
  ios: { sqlite: 'Documents/SQLite', mmkv: 'Documents/mmkv' },
  android: { sqlite: 'files/SQLite', mmkv: 'files/mmkv' },
} as const;

/** App-container directories (relative to the container root) excluded from iOS backups. */
export const IOS_BACKUP_EXCLUDED_DIRECTORIES = ['Documents', 'Library/Application Support'] as const;

export type IosBackupExcludedDirectory = (typeof IOS_BACKUP_EXCLUDED_DIRECTORIES)[number];
