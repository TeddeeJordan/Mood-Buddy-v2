# Changelog

All notable changes to Mood Buddy v2 are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

The "Foundation" milestone (the app shell and infrastructure), the first slice of Home and the offline part of Profile. The first slice of Profile (offline) is built. Dashboard, Diary, Settings and Chat are still placeholders.

### Added

- **Mood check-in (Home):** pick how you feel, your stress level and your anxiety level, then tap Submit. If stress or anxiety is high, you can add up to three short notes (50 characters each) about what is causing it. If you skip a row, "Please choose one." appears under it and screen readers announce what is missing. After saving you see "Saved! Your mood has been recorded." Each check-in also creates a diary prompt, and diary prompts older than 90 days are removed. Screen readers read each choice as a word, not a number. The top stress choice (the leftmost stress tile) is labelled "Crushed". On iOS, VoiceOver reads "Saved! Your mood has been recorded." without it being cut off by other announcements. On Android, changing the system Font size keeps your unsaved check-in (choices, notes and counter) and re-sizes the text; changing Display size still restarts the screen and loses an unsaved draft. AI chat after a check-in is not available yet.

- **Profile (bio and photo):** open Profile from the menu to see your photo and bio. Tap the pencil ("Edit profile") to change them, the X ("Cancel editing") to stop, or the check mark ("Save profile") to save; "Profile saved" confirms it.
  - The bio holds up to 1000 characters. A counter ("n / 1000") shows how many you have used, and "Character limit reached." appears at the limit.
  - In edit mode, tap the photo to choose a new one from your library, crop it to a square, or choose "Remove photo". The app uses the phone's own photo picker, so it never asks for access to your photos. Your photo is copied into the app when you save.
  - If you leave Profile (tab, menu item or Android back button) with unsaved changes, a "Discard changes?" box offers "Keep editing" or "Discard". The X button does not ask.
  - With no bio yet, Profile says "No bio yet. Use Edit profile to add one." The Daily Inspiration card is not built yet.
  - **Text size:** changing the phone's text size while the app is open now re-sizes text across the app without losing what you typed. On Android the change shows up when you come back to the app from Settings. Screen headers grow to fit larger text, and text in inputs, helper messages and menus follows the system size fully; only the emoji tiles on Home keep a size limit.
  - Needs a new development build: run `npx expo prebuild --clean` and rebuild (new native module `expo-image-picker`; `expo-file-system` added).
- **App identity:** new app "Mood Buddy" (slug `mood-buddy-2`), bundle identifier and Android package `com.teddeej.moodbuddy2`, URL scheme `moodbuddy2`. Phones only, portrait, light theme. This is a separate install from the original Mood Buddy.
- **Tooling:** ESLint, TypeScript strict type-checking and Jest with Testing Library. Coverage thresholds are 65% lines, statements and functions, and 50% branches. `yarn test:tz` runs the suite in two time zones, and `yarn run check` runs everything as the done-gate. Development builds are required (Expo Go is not supported); EAS profiles `development`, `development-simulator`, `preview` and `production`.
- **Navigation shell:** a drawer (Diary, Profile, Settings) around two visible tabs (Home, Dashboard). Diary, Profile and Settings are hidden tabs, so the tab bar stays visible. Chat opens above the drawer as its own screen. Tab presses give haptic feedback on iOS.
- **Theme:** React Native Paper light themes in three palettes (lavender default, sage, water), with the owner's colours used as containers and deeper shades of the same hue for text and thin UI (contrast option C). A test checks the contrast of every colour token.
- **Data layer:**
  - On-device SQLite database with versioned migrations (schema v1: mood entries, diary prompts, profile), foreign keys on for every connection and cascade delete of a diary prompt with its entry. Entry and prompt storage is implemented for the Home check-in, and profile storage for the Profile screen.
  - Settings stored with MMKV (theme, reminder, AI toggle and related flags), kept in Redux and saved automatically.
  - API key storage wrapper over the device's secure storage (`expo-secure-store`); the key is never held in Redux or MMKV, and first-install cleanup runs at startup.
  - Redux Toolkit store and a TanStack Query client with a central set of query keys; refetch-on-focus follows the app's foreground state.
- **Date helpers:** an entry's day is computed from its UTC timestamp and the offset stored with it, so travel does not move past entries. Includes date keys, search windows, "clamp to today" and the diary upper bound.
- **Scales:** mood, stress and anxiety scale definitions (stored 1 to 5, with stress and anxiety displayed 5 to 1) and the note rule for stored values of 4 or more.
- **Startup:** the splash screen stays up until the database, settings and key check are ready; a root error boundary shows startup errors instead of a stuck splash. If the key check has not finished after 4 seconds, the app opens anyway (treating the key as not set) so the splash can never hang; a late result still updates it.
- **Accessibility:**
  - Screen readers find exactly one icon per tab (no hidden duplicate).
  - Tab labels count visible tabs only ("Home, tab, 1 of 2" on iOS; "Home, 1 of 2" on Android).
  - Selected tabs and drawer items no longer rely on colour alone: they use a filled icon, and the active drawer item gets a border.
  - A helper builds word-only labels for scale tiles (for example "Stressed, high stress"); the tiles are now used on Home.
  - Header and drawer icon buttons have larger touch targets, so they are easier to tap.
- **Documentation:** architecture map, architecture decision records and contributing guide in `docs/`.

### Changed

- The Profile storage code now uses the same database interface as the rest of the app, so it can be tested against a real database.
- The screen header now grows with larger text instead of staying a fixed height, and its title wraps instead of being cut off. The header was rebuilt (no longer Paper's app bar) because on iOS the old one still clipped large titles; see [ADR 014](docs/adr/014-screen-header-not-appbar.md).
- Profile: the Bio field now shows a "Bio" label above the box instead of a label that floated inside the outline, so it is no longer cut off at the largest text sizes. Screen readers still read "Bio".
- Text in inputs, helper messages, checkbox labels and menu items no longer has a hidden 1.5x size limit (the library's default); it follows the system text size.
- The empty Profile message changed from "Tap the pencil to add a bio..." to "No bio yet. Use Edit profile to add one."

### Known issues

- At the largest iOS text size, menu (drawer) items can be cut off.
- At the largest text size, the "Discard changes?" box can be taller than the screen.
- On Android, the menu's Settings item was once missing after changing the text size while the app was open (not reproduced).
- On Android, a text size change made while the app stays open shows up only when you come back to the app.

### Removed

- The unused direct `@expo/ui` dependency was removed from `package.json`. It is still installed indirectly through `expo-router`; add it back with `npx expo install @expo/ui` when the reminder time picker is built.

### Security

- Android permissions `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are blocked in the app config.
- The iOS export-compliance flag is set to "no non-exempt encryption".
- ESLint blocks importing the API-key reader outside the (not yet built) Anthropic service and tests.
- **No backups:** app data is excluded from OS backups on both platforms. Android app backup is off (`allowBackup: false`); expo-secure-store's backup rules stay on, so a device-to-device transfer can't carry the database or settings either. On iOS, a small built-in native module marks the app's data folders as excluded from iCloud and computer backups at every launch. As a result, data does not carry over to a new phone, a restored phone or a reinstall; export (planned) is the way to keep a copy.
- **Profile photo:** your photo stays on this device and is saved in the app's data folder, which is excluded from backups and never exported. The app uses the system photo picker, so it needs no photo-library permission and has no iOS photo or camera permission text; the Android `CAMERA` permission is blocked as well. The picker's temporary copies are deleted after you save, cancel, discard or remove a photo. Note: the saved copy of your photo is a copy of the file you picked and may still contain its metadata (such as location); the app does not strip it. Details in [ADR 011](docs/adr/011-profile-photo-storage.md).
- The iOS Face ID permission text is no longer added to the app, because the app doesn't use Face ID.
- **Known dependency advisories:** `yarn audit` reports 4 advisories, all inside Expo's own packages, with no fix reachable yet without overriding Expo's pinned versions. Only one (`decode-uri-component`, moderate, malformed links) ships in the app; the rest are build-time tools. Details in [ADR 007](docs/adr/007-dependency-audit-exceptions.md).
