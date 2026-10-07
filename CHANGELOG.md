# Changelog

All notable changes to Mood Buddy v2 are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

The "Foundation" milestone: the app shell and infrastructure. There are no feature screens yet; Home, Dashboard, Diary, Profile, Settings and Chat are placeholders.

### Added

- **App identity:** new app "Mood Buddy" (slug `mood-buddy-2`), bundle identifier and Android package `com.teddeej.moodbuddy2`, URL scheme `moodbuddy2`. Phones only, portrait, light theme. This is a separate install from the original Mood Buddy.
- **Tooling:** ESLint, TypeScript strict type-checking and Jest with Testing Library. Coverage thresholds are 65% lines, statements and functions, and 50% branches. `yarn test:tz` runs the suite in two time zones, and `yarn run check` runs everything as the done-gate. Development builds are required (Expo Go is not supported); EAS profiles `development`, `development-simulator`, `preview` and `production`.
- **Navigation shell:** a drawer (Diary, Profile, Settings) around two visible tabs (Home, Dashboard). Diary, Profile and Settings are hidden tabs, so the tab bar stays visible. Chat opens above the drawer as its own screen. Tab presses give haptic feedback on iOS.
- **Theme:** React Native Paper light themes in three palettes (lavender default, sage, water), with the owner's colours used as containers and deeper shades of the same hue for text and thin UI (contrast option C). A test checks the contrast of every colour token.
- **Data layer:**
  - On-device SQLite database with versioned migrations (schema v1: mood entries, diary prompts, profile), foreign keys on for every connection and cascade delete of a diary prompt with its entry. Repository interfaces are defined but not implemented yet.
  - Settings stored with MMKV (theme, reminder, AI toggle and related flags), kept in Redux and saved automatically.
  - API key storage wrapper over the device's secure storage (`expo-secure-store`); the key is never held in Redux or MMKV, and first-install cleanup runs at startup.
  - Redux Toolkit store and a TanStack Query client with a central set of query keys; refetch-on-focus follows the app's foreground state.
- **Date helpers:** an entry's day is computed from its UTC timestamp and the offset stored with it, so travel does not move past entries. Includes date keys, search windows, "clamp to today" and the diary upper bound.
- **Scales:** mood, stress and anxiety scale definitions (stored 1 to 5, with stress and anxiety displayed 5 to 1) and the note rule for stored values of 4 or more.
- **Startup:** the splash screen stays up until the database, settings and key check are ready; a root error boundary shows startup errors instead of a stuck splash. If the key check has not finished after 4 seconds, the app opens anyway (treating the key as not set) so the splash can never hang; a late result still updates it.
- **Accessibility:**
  - Tab labels count visible tabs only ("Home, tab, 1 of 2" on iOS; "Home, 1 of 2" on Android).
  - Selected tabs and drawer items no longer rely on colour alone: they use a filled icon, and the active drawer item gets a border.
  - A helper builds word-only labels for scale tiles (for example "Stressed, high stress"); the tiles themselves are not built yet.
  - Header and drawer icon buttons have larger touch targets, so they are easier to tap.
- **Documentation:** architecture map, architecture decision records and contributing guide in `docs/`.

### Removed

- The unused direct `@expo/ui` dependency was removed from `package.json`. It is still installed indirectly through `expo-router`; add it back with `npx expo install @expo/ui` when the reminder time picker is built.

### Security

- Android permissions `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are blocked in the app config.
- The iOS export-compliance flag is set to "no non-exempt encryption".
- ESLint blocks importing the API-key reader outside the (not yet built) Anthropic service and tests.
- **No backups:** app data is excluded from OS backups on both platforms. Android app backup is off (`allowBackup: false`); expo-secure-store's backup rules stay on, so a device-to-device transfer can't carry the database or settings either. On iOS, a small built-in native module marks the app's data folders as excluded from iCloud and computer backups at every launch. As a result, data does not carry over to a new phone, a restored phone or a reinstall; export (planned) is the way to keep a copy.
- The iOS Face ID permission text is no longer added to the app, because the app doesn't use Face ID.
- **Known dependency advisories:** `yarn audit` reports 4 advisories, all inside Expo's own packages, with no fix reachable yet without overriding Expo's pinned versions. Only one (`decode-uri-component`, moderate, malformed links) ships in the app; the rest are build-time tools. Details in [ADR 007](docs/adr/007-dependency-audit-exceptions.md).
