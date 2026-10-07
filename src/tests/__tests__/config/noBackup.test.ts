/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AndroidConfig, IOSConfig } from 'expo/config-plugins';

import {
  DEFAULT_DATA_DIRECTORIES,
  IOS_BACKUP_EXCLUDED_DIRECTORIES,
} from '@/constants/dataLocations';
import {
  getBackupExclusionStatus,
  isBackupExclusionComplete,
  loadNoBackupModule,
  type NoBackupNativeModule,
} from '@/services/storage/backupExclusion';

/** Jest's rootDir (the project root), as in src/tests/helpers/runInTimeZone.ts. */
const ROOT = process.cwd();
const { join } = path;
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/** App source files (tests excluded). */
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'tests' ? [] : listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

type PluginEntry = string | [string, Record<string, unknown>];
const appJson = JSON.parse(read('app.json')) as {
  expo: { android: { allowBackup?: boolean }; plugins: PluginEntry[] };
};
const expoConfig = appJson.expo;

function pluginOptions(name: string): Record<string, unknown> | undefined {
  const entry = expoConfig.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : undefined;
}

describe('app.json (D49 no backup, Face ID)', () => {
  it('disables Android backup', () => {
    expect(expoConfig.android.allowBackup).toBe(false);
  });

  it('sets the merged manifest attribute to false via the AllowBackup mod', () => {
    const manifest = {
      manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication' } }] },
    } as unknown as AndroidConfig.Manifest.AndroidManifest;
    const result = AndroidConfig.AllowBackup.setAllowBackup(
      expoConfig as Parameters<typeof AndroidConfig.AllowBackup.setAllowBackup>[0],
      manifest,
    );
    expect(AndroidConfig.AllowBackup.getAllowBackupFromManifest(result)).toBe(false);
  });

  it('keeps expo-secure-store backup rules and turns off the Face ID string', () => {
    expect(pluginOptions('expo-secure-store')).toEqual({
      faceIDPermission: false,
      configureAndroidBackup: true,
    });
  });

  it('removes NSFaceIDUsageDescription when faceIDPermission is false', () => {
    const plist = IOSConfig.Permissions.applyPermissions(
      { NSFaceIDUsageDescription: 'default' },
      { NSFaceIDUsageDescription: pluginOptions('expo-secure-store')?.faceIDPermission as false },
      { NSFaceIDUsageDescription: 'stale' },
    );
    expect(plist).not.toHaveProperty('NSFaceIDUsageDescription');
  });
});

describe('modules/no-backup (iOS backup exclusion)', () => {
  const moduleConfig = JSON.parse(read('modules/no-backup/expo-module.config.json')) as {
    platforms: string[];
    apple: { modules: string[]; appDelegateSubscribers: string[] };
  };

  it('registers the module and the launch-time AppDelegate subscriber for Apple only', () => {
    expect(moduleConfig.platforms).toEqual(['apple']);
    expect(moduleConfig.apple.modules).toEqual(['NoBackupModule']);
    expect(moduleConfig.apple.appDelegateSubscribers).toEqual(['NoBackupAppDelegateSubscriber']);
  });

  it('excludes exactly the directories listed in dataLocations', () => {
    const swift = read('modules/no-backup/ios/BackupExclusion.swift');
    const searchPaths = swift.match(/let searchPaths: \[FileManager\.SearchPathDirectory\] = \[(.*)\]/);
    expect(searchPaths?.[1].split(',').map((s) => s.trim())).toEqual([
      '.documentDirectory',
      '.applicationSupportDirectory',
    ]);
    expect(IOS_BACKUP_EXCLUDED_DIRECTORIES).toEqual(['Documents', 'Library/Application Support']);
  });

  it('covers the default SQLite and MMKV directories on iOS', () => {
    for (const dir of Object.values(DEFAULT_DATA_DIRECTORIES.ios)) {
      expect(IOS_BACKUP_EXCLUDED_DIRECTORIES.some((excluded) => dir.startsWith(`${excluded}/`))).toBe(true);
    }
  });

  it('keeps SQLite and MMKV on their default directories everywhere in src/', () => {
    const sources = listSourceFiles(join(ROOT, 'src')).map((file) => readFileSync(file, 'utf8'));
    expect(sources.some((src) => src.includes('<SQLiteProvider'))).toBe(true);
    expect(sources.some((src) => src.includes('createMMKV('))).toBe(true);
    for (const src of sources) {
      expect(src).not.toMatch(/<SQLiteProvider[^>]*\bdirectory=/);
      expect(src).not.toMatch(/openDatabase(Sync|Async)\([^)]*,[^)]*,/);
      expect(src).not.toMatch(/createMMKV\(\{[^}]*\bpath\s*:/);
    }
  });
});

describe('backupExclusion wrapper', () => {
  const statuses = [
    { path: '/c/Documents', excluded: true },
    { path: '/c/Library/Application Support', excluded: true },
  ];
  const fakeModule: NoBackupNativeModule = { getStatus: () => statuses, apply: () => statuses };

  it('returns null where the native module is not linked (Jest, Android)', () => {
    expect(loadNoBackupModule()).toBeNull();
    expect(getBackupExclusionStatus()).toBeNull();
    expect(isBackupExclusionComplete(null)).toBeNull();
  });

  it('reads the status from the native module', () => {
    expect(getBackupExclusionStatus(fakeModule)).toEqual(statuses);
    expect(isBackupExclusionComplete(statuses)).toBe(true);
  });

  it('reports incomplete when a directory is not excluded, failed, or none were reported', () => {
    expect(isBackupExclusionComplete([{ path: '/c/Documents', excluded: false }])).toBe(false);
    expect(isBackupExclusionComplete([{ path: '/c/Documents', excluded: true, error: 'denied' }])).toBe(false);
    expect(isBackupExclusionComplete([])).toBe(false);
  });
});
