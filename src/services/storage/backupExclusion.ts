import { requireOptionalNativeModule } from 'expo';

/**
 * JS access to the local `NoBackup` module (modules/no-backup, iOS only; SPEC D49, ADR 006).
 * The exclusion itself runs natively at launch (NoBackupAppDelegateSubscriber), before any JS,
 * so the app never needs to call `apply` for correctness. These functions exist for the
 * verification check (SPEC Verification log) and diagnostics.
 * Returns `null` where the module isn't linked: Android (covered by `allowBackup: false`) and Jest.
 */

export type BackupExclusionStatus = {
  /** Absolute path of an excluded app-container directory. */
  path: string;
  excluded: boolean;
  /** Native error description, if creating or flagging the directory failed. */
  error?: string;
};

export type NoBackupNativeModule = {
  getStatus(): BackupExclusionStatus[];
  apply(): BackupExclusionStatus[];
};

export function loadNoBackupModule(): NoBackupNativeModule | null {
  return requireOptionalNativeModule<NoBackupNativeModule>('NoBackup');
}

/** Current flag per directory, or `null` when the native module isn't available. */
export function getBackupExclusionStatus(
  nativeModule: NoBackupNativeModule | null = loadNoBackupModule(),
): BackupExclusionStatus[] | null {
  return nativeModule ? nativeModule.getStatus() : null;
}

/** True when every directory reports excluded and none failed; `null` when not applicable. */
export function isBackupExclusionComplete(statuses: BackupExclusionStatus[] | null): boolean | null {
  if (statuses === null) return null;
  return statuses.length > 0 && statuses.every((s) => s.excluded && s.error === undefined);
}
