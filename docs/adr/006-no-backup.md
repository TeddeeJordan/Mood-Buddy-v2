# 006. App data is excluded from OS backups

**Status:** Accepted (owner decision, SPEC Rev 7). Spec: D49 (also D2, D14, D30, D50).

## Context

Mood Buddy holds a private mood journal (SQLite), settings (MMKV) and, optionally, the user's Anthropic API key (SecureStore). The owner asked: "Let's ensure it's not backed up." By default both platforms back app data up:

- **Android** Auto Backup copies app files to Google Drive and moves them in device-to-device (D2D) transfers. `android:allowBackup` defaults to `true` in Expo's config plugins.
- **iOS** iCloud and computer backups include the app's `Documents/` and `Library/` (except `Library/Caches` and `tmp`). expo-sqlite stores its database in `Documents/SQLite` and MMKV in `Documents/mmkv` (both verified in the installed native source).

## Options considered for iOS

- **A. A small native step that flags the data directories excluded from backup.** Chosen by the owner.
- **B. Move the data into `Library/Caches`.** Rejected: the system may purge Caches, which would lose the journal.
- **C. Do nothing on iOS.** Rejected: it wouldn't meet the decision.

## Decision

**Android.** `android.allowBackup: false` in `app.json`. expo-secure-store's `configureAndroidBackup: true` stays on. Its data-extraction rules include only shared preferences (minus the SecureStore file) for both cloud backup and D2D transfer. On Android 12+ some manufacturers' devices still run D2D transfers when `allowBackup="false"`, so these rules are what keep SQLite (`files/SQLite`) and MMKV (`files/mmkv`) out of such a transfer. Turning the option off would remove that protection. Adding our own rules alongside it would make the plugin skip its rules with a warning.

**iOS.** A local Expo module, `modules/no-backup` (Apple only, autolinked from `./modules`, no third-party dependency):

- `NoBackupAppDelegateSubscriber` runs at every launch (`didFinishLaunchingWithOptions`) before any JS. It creates `Documents/` and `Library/Application Support/` if needed and sets `isExcludedFromBackup = true` on both. Apple's guidance is to group excludable files in a directory and flag the directory. Certain file operations can reset the flag, so it runs again on every launch. That also covers app updates and files created after the last launch.
- `NoBackupModule` exposes `getStatus()` / `apply()` to JS for verification only. The wrapper is `src/services/storage/backupExclusion.ts`.
- Running natively at launch beats calling it from the JS bootstrap. It runs before expo-sqlite or MMKV open files, it doesn't depend on JS startup succeeding, and it needs no extra startup step in JS.
- Flagging `Documents/` itself is preferable to pointing expo-sqlite (`directory`) and MMKV (`path`) at a dedicated subdirectory. It keeps both libraries on their defaults (no path plumbing, no Android change, no new expo-file-system dependency), and it also covers future document-directory files such as the profile photo.

**Keychain.** The API key uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Items with that attribute never migrate to a different device, so after restoring another device's backup the key is absent. Keychain items do survive an app uninstall on the same device; the first-run cleanup deletes them (SPEC §2.8).

**Data locations.** Keep SQLite and MMKV on their library-default directories. Put new persistent files in the document directory and temporary files in the cache directory (`src/constants/dataLocations.ts`, CLAUDE.md "Storage and security"). A test fails if a `directory` or `path` override appears in `src/`.

## Consequences

- **Users lose all app data when they change phones, restore a phone from a backup, or uninstall and reinstall.** CSV export (D14) is the only way to take entries along. It does not include the profile photo, bio or settings. Delete-all (D30) is the way to erase data. The privacy text says so.
- Apple describes the flag as guidance to the system, "not a mechanism to guarantee those items never appear in a backup or on a restored device". Whether computer (Finder) backups and Quick Start device-to-device migration honour it is unverified.
- `Library/Preferences` (UserDefaults) is not flagged. The app stores no user data there.
- Residual on Android: shared preferences other than SecureStore can still move in a manufacturer D2D transfer. They hold no user data today. If expo-notifications later stores reminder schedules there, revisit this with a custom exclude-everything rules file. That would need its own config plugin and `configureAndroidBackup: false`.
- One more native module to keep compiling across SDK upgrades. It's three short Swift files.
- **Device-unverified until the first development builds:** the module compiles and links; the flag is set on the simulator (debug check in the SPEC Verification log, Rev 7); the Gradle-merged Android manifest has `android:allowBackup="false"` with no merger conflict.
