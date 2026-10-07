import { readInstallInitialized, writeInstallInitialized } from './settingsStorage';
import { removeApiKey } from './secureKeyStore';

/**
 * iOS keychain items survive uninstall but MMKV does not. On the first launch of a fresh
 * install, delete any orphaned API key BEFORE `hasApiKey` is derived (SPEC §2.8).
 * The flag is set only after the delete succeeds, so a failure retries next launch.
 * Returns true when the cleanup ran.
 */
export async function runFirstInstallCleanup(): Promise<boolean> {
  if (readInstallInitialized()) return false;
  await removeApiKey();
  writeInstallInitialized(true);
  return true;
}
