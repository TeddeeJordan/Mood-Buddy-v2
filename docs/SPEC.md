# Mood Buddy v2 — Rewrite Spec

| | |
|---|---|
| Old app (read-only reference) | `/Users/teddeejordan/Desktop/Development/mood_buddy` (commit `bdeaa2f`, "fixed ios keyboard") |
| New app | `/Users/teddeejordan/Desktop/Development/mood-buddy-v2` |
| Spec date | Rev 1 and Rev 2: 2026-10-06. Rev 3: 2026-10-07. Rev 4: 2026-10-07. Rev 5: 2026-10-07. Rev 6: 2026-10-07. Rev 7: 2026-10-07. |
| Status | **Rev 7** (owner decisions after Rev 6, 2026-10-07): **D49** (no OS backups of app data on either platform) and **D50** (no Face ID usage string; resolves the Rev 6 open decision) added; Verification log, Rev 7 block. No earlier decision changed. **Rev 6** (foundation review fixes, 2026-10-07): Verification-log additions only (Rev 6 block); no decision changed; one open owner decision (Face ID usage string, §7.1; **resolved in Rev 7 as D50**). **Rev 5** (foundation build, 2026-10-07): corrections from implementation-time checks only; no decision changed (Verification log, Rev 5 block). **Rev 4.** Owner answers to Q1–Q21 are folded in as D13–D32 plus N1 (Rev 2). Owner answers to Q22–Q32 are folded in as D33–D43, and the reviewer's should-fix items a–g are applied (Rev 3). Owner answers to Q33–Q37 are folded in as D44–D48, and the reviewer's Rev 3 items 1–10 are applied (Rev 4). No owner questions from Q1–Q37 remain open (§7.1); only implementation-time checks are left. |
| Rules source | `mood-buddy-v2/AGENTS.md`, plus the architect agent's built-in conventions adopted per D23 (alignment table in §6.3) |

**How to read citations.** `path:L10-20` is relative to the **old** app root unless prefixed with `v2:`. Every citation and constant was re-read from source while this spec was written. Anything not confirmed in code or docs is marked **unverified**. Doc checks were made against `https://docs.expo.dev/versions/v57.0.0/` and the Anthropic docs. Each check carries its own date in the Verification log: Rev 1–2 checks on 2026-10-06, Rev 3 and Rev 4 checks on 2026-10-07. Where a check relied on the installed `node_modules` rather than a published page, the spec says so; **source-verified** means the installed package source was read, not that a native build was run.

---

## Target baseline (v2)

Source: `v2:package.json`, `v2:app.json`, `v2:tsconfig.json`, `v2:src/`.

| Item | v2 today | Notes for the rewrite |
|---|---|---|
| expo | `~57.0.27` | Use the versioned docs at `https://docs.expo.dev/versions/v57.0.0/`. Do not rely on memory. |
| expo-router | `~57.0.25` | Bundles React Navigation internally (`node_modules/expo-router/build/react-navigation/*`). It also depends on `react-native-drawer-layout ^4.2.2` (`v2:node_modules/expo-router/package.json`). |
| react-native / react | `0.86.3` / `19.2.3` | |
| typescript | `~6.0.3`, `strict: true` | |
| Path alias | `@/*` → `./src/*`, `@/assets/*` → `./assets/*` | `v2:tsconfig.json` |
| Routes | `src/app/` (`_layout.tsx`, `index.tsx`, `explore.tsx` are template files) | Per AGENTS.md, only route files go in `src/app/`. |
| Template nav | `NativeTabs` from `expo-router/unstable-native-tabs` (`v2:src/components/app-tabs.tsx:1`) | Replace with Drawer wrapping **JS** Tabs (D7, D35). NativeTabs can't be used: its `hidden` tabs "cannot be navigated to in any way" (installed types). |
| Experiments | `typedRoutes: true`, `reactCompiler: true` (`v2:app.json`) | Keep both. |
| Slug | `mood-buddy-v2` | Change to **`mood-buddy-2`** (D33, final per D45). |
| Scheme | `moodbuddyv2` | Change to **`moodbuddy2`** (D33, D45). Differs from the old `moodbuddy`. |
| iOS / Android IDs | none set; no `eas.json` | iOS `bundleIdentifier` and Android `package` both **`com.teddeej.moodbuddy2`**; EAS owner `teddeej`; **new** EAS project (D33, final per D45). Must not be `com.teddeej.moodbuddy` or the old EAS `projectId`. |
| `userInterfaceStyle` | `automatic` | Set to `light`, because there is no dark mode (D6). |
| Splash plugin config | Template: `expo-splash-screen` with `backgroundColor: "#208AEF"`, `image: "./assets/images/splash-icon.png"`, `imageWidth: 76` (`v2:app.json:29-34`) | **Replace** with the D41 setup in §3.11 (transparent `image`, sampled sky `backgroundColor`). The template `splash-icon.png` and blue colour go. |
| Android `minSdkVersion` | Not set in `v2:app.json`; defaults to **24** (Android 7.0) (`v2:node_modules/react-native/gradle/libs.versions.toml:3`; `expo-modules-autolinking/.../ExpoRootProjectPlugin.kt:53` falls back to `"24"`) | Android 7.0–11 are **in scope** (relevant to §3.11). Not raised. |
| Android edge-to-edge | Always on in SDK 57: `@expo/prebuild-config` `withEdgeToEdge.js:26-27` warns that `edgeToEdgeEnabled` "is no longer available - Android 16 makes edge-to-edge mandatory". v2 `app.json` has no such key; the old app set `"edgeToEdgeEnabled": true` (`app.json:22`). Source-partially verified: `withEdgeToEdge.js:26-27` only warns about the key and restores the default theme; it does not write `gradle.properties`. Confirmed with `npx expo prebuild` on 2026-10-07: `edgeToEdgeEnabled=true` is in `android/gradle.properties` (Rev 5). | Do not add `edgeToEdgeEnabled`. Screens must handle safe-area insets; the JS splash overlay can draw behind the system bars (§3.11). |
| Web | `web` block in app.json, `react-native-web`, `react-dom`, `*.web.tsx` files | Remove (D10). |
| Already installed and useful | `@expo/ui ~57.0.22`, `expo-image`, `expo-splash-screen`, `expo-symbols`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `expo-file-system 57.0.7` (transitive only) | |
| Installed / not installed yet (Rev 5) | **Installed by the foundation build:** jest-expo, jest, @types/jest, `@react-native/jest-preset ~0.86.3` (required peer of jest-expo 57; `expo install` resolved 0.87.1 and had to be pinned), @testing-library/react-native 14 + test-renderer 1.2 (1.3 needs React ≥ 19.3), eslint + eslint-config-expo, react-native-paper, `@expo/vector-icons` (Paper icons), expo-sqlite, expo-secure-store, expo-haptics, `expo-dev-client`, react-native-mmkv 4.3.2, react-native-nitro-modules 0.37.1, @reduxjs/toolkit, react-redux, @tanstack/react-query. **Not installed yet** (land with their first consumer): expo-notifications, expo-sharing, expo-image-picker, expo-file-system (direct), expo-localization, axios, @shopify/flash-list (SDK 57 pins **2.0.2** in `expo/bundledNativeModules.json`). | Install with `npx expo install <pkg>`. The repo has `yarn.lock` only. Only open package check: MMKV 4 / Nitro build on RN 0.86 (first development build). |
| Build type | — | **Development build required**; Expo Go is not a target (MMKV per D23 is not in Expo Go; see D26). |
| Package manager | yarn (only `yarn.lock`) | Keep exactly one lockfile. |
| Done-gate | `npx expo lint` and `npx tsc --noEmit` | AGENTS.md "Commands". |

---

## Decisions (owner answers, recorded 2026-10-06 and 2026-10-07)

These override old behavior wherever they conflict with it. D1–D12 came from the first round. D13–D32 fold in the owner's answers to Q1–Q21, D33–D43 the answers to Q22–Q32, and D44–D48 the answers to Q33–Q37 (original Q number cited). D44 is Q36 because the reviewer's Rev 3 notes already referenced it by that number; D45–D48 follow in Q order. D49–D50 are owner decisions made directly after Rev 6 (no Q number). Rows marked **interpreted as …** record how an ambiguous answer was read; where a later decision confirmed the reading, the row names it. No reading has an open question left (§7.1). Earlier rows keep their wording where still true; where a later decision settles or changes them, the row points to it.

| # | Decision | What it means for the spec |
|---|---|---|
| D1 | v2 is a **fresh app**. There is no migration from the old `moodbuddy.db`. | The old schema (`lib/database.ts:6-136`) is reference only. Drop the ad-hoc migration (`lib/database.ts:38-53`). |
| D2 | AI uses **bring-your-own Anthropic key**, stored in `expo-secure-store` (not SQLite). Model is **Sonnet**. **No chat history persistence.** | Verified the current Sonnet ID is **`claude-sonnet-5-5`** (Anthropic models overview, fetched 2026-10-06). `anthropic-version: 2023-06-01` is still the current header (Anthropic "Versions" page). |
| D3 | Keep the auto-generated diary entries and the **90-day expiry**. | Same as `lib/database.ts:138-146`. |
| D4 | **Reverse the stress and anxiety scales**: a higher number means more stress or anxiety. Notes appear only when the value is **≥ 4**. Mood keeps 1 = worst … 5 = best. | See the knock-on table in §3.2. Confirmed and made exact by D39 (1 = least, 5 = most stress/anxiety); display order set by D48. |
| D5 | **Multiple entries per day** are allowed. Add **delete single entry**, **export**, and **delete all my data**. | The old app already allows several entries a day (no unique constraint, `lib/database.ts:24-36`). Delete and export are new. |
| D6 | Keep **react-native-paper** and the **three themes**. **No dark mode.** | |
| D7 | Keep the **drawer** for now, using expo-router's drawer. No direct `@react-navigation/*` dependencies. | Import paths are verified in §6.1. Structure settled by D35. |
| D8 | Keep **ZenQuotes**. | |
| D9 | **One daily reminder**, skipped on days the user already checked in. Tapping it opens Home. | A repeating trigger can't do this. Mechanism: rolling one-shot triggers (§3.6 option B, D28). |
| D10 | **No web target.** | |
| D11 | **New** bundle identifiers (D13). **No tablet support.** | Old `ios.supportsTablet: true` (`app.json:12`) becomes `false`. |
| D12 | Test coverage target is **65%**. Notifications and chat need not be covered. | Old threshold was `coverageThreshold.global.lines: 60` only (`package.json:41-45`). Metrics: D32. |
| D13 (Q1) | **New identifiers.** v2 is a separate install, not an update of the old app. | Do **not** reuse `com.teddeej.moodbuddy` (`app.json:15`) or the old EAS `projectId` (`app.json:67-69`). Create a new EAS project. Strings: D33. Side effect: no iOS keychain carry-over from the old app, and the old `moodbuddy.db` is never touched (consistent with D1). |
| D14 (Q2) | **Export = CSV**, entries plus their diary prompts. **No photo.** A **date-range filter**. The temp file is **deleted from cache after sharing**. | Rules in §3.9. **Interpreted as:** one CSV file, one row per check-in, with the linked diary prompt as a column (empty once purged at 90 days); profile bio is not exported (owner only listed entries/prompts). Confirmed: D34. |
| D15 (Q3) | **Validate the Anthropic key on first chat**, not on Save. | Save makes no network call. The first chat request is the validation; a 401/403 there shows "Your API key was rejected" with **Open Settings**. Rules in §3.10. Architect defaults (not owner-decided, no question needed): trim on save; warn but allow keys without the `sk-ant-` prefix; mask after save with **Replace** / **Remove** actions (§6.1). |
| D16 (Q4) | Diary calendar **disables dates older than the 90-day prompt window** (and future dates, B14; upper bound per §3.5 timezone-travel rule). Deleting an entry **deletes its prompt** (D18). Export **includes prompts close to expiry** (no exclusion). | "Older" **interpreted as** older than the D3 90-day window, because prompts there are always purged. Boundary rule in §3.3. Export includes every prompt still stored when the export runs; prompts already purged cannot be exported (§3.9). |
| D17 (Q5) | **Drawer drops Home and Dashboard.** Tabs keep **haptics**. | Drawer items become Diary, Profile, Settings. Tab haptics stay **iOS-only** as today (`components/haptic-tab.tsx:9-15`), re-implemented with `expo-haptics` and no `@react-navigation/elements` import. The return-to-tabs gap is closed by D35 (Diary/Profile/Settings become hidden tabs, so the tab bar stays visible). |
| D18 (Q6) | Deleting an entry **deletes its diary prompt**. Delete UI is **swipe-to-delete with a confirmation modal on the Diary screen**. Proposed schema accepted. | `diary_prompts.entry_id INTEGER NOT NULL REFERENCES mood_entries(id) ON DELETE CASCADE` (§2.7). Swipe a Diary card → Paper `Dialog` confirm → delete the **entry**; the prompt goes with it. Details and a11y alternative in §3.8. Entries older than 90 days have no Diary card, so they cannot be deleted one by one (only via delete-all); accepted by D36. |
| D19 (Q7) | **Hide the AI chat prompt until an API key exists.** | Neither Home dialog (first-time "Chat about your feelings?" nor "Talk about your mood?") is shown while no key is stored; the user gets the "Saved!" confirmation instead, and `ai_chat_prompt_shown` stays unset so the first-time dialog appears after the first check-in once a key exists. §3.10. |
| D20 (Q8) | **Store the UTC offset at write time.** **Reschedule rolling reminders 24 hours after a timezone change.** | New column `tz_offset_min` on `mood_entries` and `diary_prompts` (§2.7). Every "which local day is this entry" calculation uses the entry's own stored offset, so past entries never shift after travel. **Interpreted as:** when the app detects a new IANA timezone, it keeps the existing reminder schedule for 24 hours, then reschedules for the new zone at the first app start/foreground after that 24-hour mark. DST changes inside one zone are **not** a timezone change. §3.6. Reading confirmed: D37. Travel edge cases (entries dated after "today", deletes during grace): §3.5, §3.6, D46, D47. |
| D21 (Q9) | ZenQuotes: **cache the last good quote as a fallback**. **Disclose ZenQuotes** in the privacy text. | Fetch at most once per local day (**architect default**, not owner-decided); on failure show the cached quote, and if there is none, a visible error with Retry (fixes B12). Privacy text (README and the in-app privacy/about note) names both network calls: Anthropic (only when AI is used) and ZenQuotes (Profile); they are the only network calls once built. It also states that all data stays on the device and is excluded from OS backups on both platforms, so it does not survive a phone change, restore or reinstall (D49). ZenQuotes terms/rate limits remain **unverified**. |
| D22 (Q10) | **Unicode-aware word-cloud tokenization.** | Replace `[^a-z\s]` (`dashboard-utils.ts:66`) with Unicode letter matching (`\p{L}` with the `u` flag). Hermes support for `\p{L}` is **unverified**; Jest runs on Node, so it must be checked on a device. Fallback if unsupported in §3.5. |
| D23 (Q11) | **Align with the architect agent's built-in conventions** (MMKV, Redux Toolkit, TanStack Query + Axios, FlashList, the `src/` folder layout and its guardrails). | Per-guideline status, and where it conflicts with AGENTS.md or other decisions, in §6.3. The one real conflict (route folder location) is settled by D38: `src/app/`. The conventions must be copied into a v2 `CLAUDE.md` Conventions section at implementation time (not created by this spec). |
| D24 (Q13) | Chat conversation is **cleared on each new check-in handoff**. | Kept in memory (no persistence, D2) across navigation; leaving the Chat screen does **not** clear it. Cleared only by: the next check-in handoff, delete-all (D30), turning the AI toggle off (D44/Q36), or app restart. Fixes B1. §3.10. |
| D25 (Q14) | **Stress and anxiety rows sit on the same side** as mood. | **Meaning settled by D48 (Q37 option b).** "Same side" now means the same *sentiment* side: in all three rows the worst state is on the left and the best on the right. Mood renders 1 → 5; stress and anxiety render 5 → 1 (most on the left, least on the right). Stored values are unaffected (D39). (Rev 3 had briefly rendered all rows 1 → 5; that is withdrawn.) |
| D26 (Q15) | "It does." | **Interpreted as:** the `@expo/ui` time picker **does need a development build**. Low impact: v2 is dev-build-only anyway because of MMKV (D23). The import-path mismatch (`@expo/ui/drop-in-replacements` in docs vs `@expo/ui/community/datetime-picker` installed) is an implementation check, not an owner question (Verification log). Closed by D40: informational only, no added requirement. |
| D27 (Q16) | **Keep the clouds.** **Fix the splash so it is full-screen** (it is not full-screen in the old app). | Requirement in §3.11. Likely cause in the old app: the native splash plugin sets `imageWidth: 200` with `resizeMode: cover` (`app.json:38-39`), so the image is drawn 200 wide rather than edge to edge, and the loading overlay shows a 200×200 GIF on white (`app/_layout.tsx:63-72,77-88`). Target look settled by D41 (the GIF fills the whole screen). |
| D28 (Q17) | **N = 14** rolling reminders. | §3.6 option B. Last scheduled notification uses the normal reminder text (D42). |
| D29 (Q18) | **Chat must not work when the AI toggle is off.** | No Anthropic request is ever sent while `ai_integration_enabled` is off. §3.10. |
| D30 (Q19) | **Delete-all clears user content only.** | "User context" **interpreted as** user content: entries, prompts, profile (bio + photo file), API key, in-memory chat. Preferences are kept: theme, reminder settings, `ai_integration_enabled`, `ai_chat_prompt_shown`, quote cache, timezone-tracking keys. Full key-by-key table in §2.8. Reminder window is rescheduled; today is included only if the reminder time hasn't passed. Keeping the two AI flags confirmed: D43. |
| D31 (Q20) | **Month and Year bars average per-day means.** | Each local day (by stored offset, D20) first collapses to the mean of its entries; buckets then average those day means. All three ranges weight days equally. §3.2, §3.8. |
| D32 (Q21) | Coverage per the **recommended** metrics. | `coverageThreshold.global`: **lines 65, statements 65, functions 65, branches 50**. Notifications and chat modules are excluded via `coveragePathIgnorePatterns` (D12). |
| D33 (Q22) | **Slug `mood-buddy-2`; identifiers under `moodbuddy2`.** | Final strings (confirmed by D45): iOS `bundleIdentifier` **`com.teddeej.moodbuddy2`**, Android `package` **`com.teddeej.moodbuddy2`** (old pattern `com.teddeej.moodbuddy`, `app.json:15`, plus `2`), EAS owner **`teddeej`** (as old, `app.json:71`), a **new** EAS project (new `projectId`; never `15cc3322-…`, `app.json:68`). Scheme changes from `moodbuddyv2` to **`moodbuddy2`**, so slug, IDs and scheme read alike. v2 accepts no deep-link payloads (§3.3); the scheme matters for notification/dev-client links and the `moodbuddy2://chat` route (§3.10). Display `name` is not part of this decision. |
| D34 (Q23) | **CSV layout confirmed.** | One file, one row per check-in, diary prompt as a column, profile bio not exported (§3.9). |
| D35 (Q24) | **Diary, Profile and Settings become hidden tabs** (reviewer option d). The tab bar stays visible on them. The drawer has **no** Home/Dashboard/"Check-in" item. | Drawer menu items: **Diary, Profile, Settings only.** Structure: Drawer → Tabs → {Home, Dashboard visible; Diary, Profile, Settings with `href: null`}. Chat moves to a root Stack screen above the drawer (architect recommendation; it was a hidden drawer screen in the old app). Verified and consequences in §6.1 ("Navigation (D35)"); return to Home is the always-visible tab bar. |
| D36 (Q25) | **Accepted:** entries older than 90 days can only be removed by delete-all. | §3.8. |
| D37 (Q26) | **Confirmed:** keep the old schedule for 24 hours after a new timezone is detected, then reschedule at the next app start/foreground. | §3.6. Clarifications in §3.6; deletes during grace: D47. |
| D38 (Q27) | **Routes live in `src/app/`.** | Follows AGENTS.md and the current v2 setup. This **deviates** from the architect agent's built-in default of a root `app/` folder; the v2 `CLAUDE.md` Conventions section must say so, so the reviewer agent doesn't flag it. Routes stay thin. |
| D39 (Q28) | **Stress and anxiety values: 1 = least, 5 = most.** Mood stays **1 = worst … 5 = best**. | This decision defines what the stored numbers **mean**; display order is a separate owner decision (D48). Stress: 1 Stressfree 🤩, 2 Chill 😌, 3 Okay 😐, 4 Stressed 😤, 5 Overwhelmed 😱. Anxiety: 1 Calm 😌, 2 Relaxed 🙂, 3 Neutral 😐, 4 Anxious 😰, 5 Panicked 😨. Notes at **≥ 4** (high stress/anxiety). Stored values, CSV values and CSV headers follow this meaning. A taller dashboard bar means a higher value: *better* for mood, *more* stress/anxiety (§3.2, informational). |
| D40 (Q29) | **No change.** The time-picker dev-build note has no practical effect. | D26 stays informational. No requirement added. |
| D41 (Q30) | **The clouds GIF fills the entire screen** (cover, edge to edge), not a small centered 200px graphic. | What each platform can do natively vs in the JS overlay, and the seamless handoff, in §3.11. Native phase: sampled sky colour with a fully transparent splash `image` (source-verified plugin requirement). |
| D42 (Q31) | **Last reminder uses the normal text.** | No special copy on the 14th notification (§3.6). |
| D43 (Q32) | **Confirmed:** delete-all keeps `ai_integration_enabled` and `ai_chat_prompt_shown`. | §2.8. |
| D44 (Q36) | **Turning the AI toggle off discards the in-memory chat.** | Toggle-off aborts any in-flight request, then clears the Redux `chat` slice (messages and any pending handoff). Turning AI back on starts empty. §3.10. |
| D45 (Q33) | **Identifier strings confirmed** exactly as proposed. | Slug `mood-buddy-2`; iOS `bundleIdentifier` and Android `package` `com.teddeej.moodbuddy2`; EAS owner `teddeej`; new EAS project; scheme `moodbuddy2` (D33, baseline table). Bundle ID and package cannot change after store release. |
| D46 (Q34) | **Entries dated after "today" after westward travel** count as today. | Agreed as proposed: clamp to device today for buckets, streak and the reminder skip; Diary/export upper bound = max(device today, latest entry local date); stored date never rewritten. §3.5. |
| D47 (Q35) | **Deletes during the timezone grace period don't restore an already-cancelled reminder.** | Accepted ("That's okay"). Deleting today's last entry or delete-all during the 24-hour grace waits for the post-grace reschedule; at most one reminder is missed. §3.6, §3.8. |
| D48 (Q37) | **Option (b): stress and anxiety render 5 → 1 left to right**, so the "good" end is on the **right** in all three rows. Mood stays 1 → 5. | **Display order only.** Stored values, CSV values and CSV headers are unchanged (D39 meaning: stress/anxiety 1 = least … 5 = most; mood 1 = worst … 5 = best). Left to right: mood Upset … Happy; stress Overwhelmed, Stressed, Okay, Chill, Stressfree; anxiety Panicked, Anxious, Neutral, Relaxed, Calm. The note fields (value ≥ 4) therefore belong to the **two leftmost** stress/anxiety tiles. Screen-reader and focus order follow visual order. Dashboard bars still grow with the value (taller = more stress/anxiety). Full knock-on list in §3.2. On-screen order matches the old app; only the stored numbers change. |
| D49 (owner, Rev 7) | **No OS backups of app data, on either platform** ("Let's ensure it's not backed up"). For iOS the owner chose option (A): a small native step that marks the app's data directories excluded from backup. | **Android:** `android.allowBackup: false` in `app.json` (honoured by `@expo/config-plugins` `AllowBackup` mod). expo-secure-store's `configureAndroidBackup: true` is **kept** as defence in depth: its rules (`secure_store_data_extraction_rules.xml`, `secure_store_backup_rules.xml`) include only shared preferences minus the SecureStore file, for cloud backup **and** device-to-device transfer. That matters because on Android 12+ some manufacturers' devices still run device-to-device transfers when `allowBackup="false"` (Android Auto Backup docs); the rules keep SQLite (`files/SQLite`) and MMKV (`files/mmkv`) out of such a transfer. **iOS:** the local Expo module `modules/no-backup` (no third-party dependency) sets `isExcludedFromBackup` on `Documents/` (expo-sqlite's `Documents/SQLite`, MMKV's `Documents/mmkv`, the future profile photo) and `Library/Application Support/` from an AppDelegate subscriber at **every launch**, before any JS runs. `Library/Caches` and `tmp` (export temp files, §3.9) are never backed up by iOS. Apple describes the flag as guidance to the system, not a guarantee. **Keychain:** the API key uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so it never migrates to a different device; after restoring a backup of another device it is absent. **Rules:** SQLite and MMKV stay on their library-default directories (no `directory`/`path` overrides); new persistent files go in the document directory, temporary files in the cache directory (`src/constants/dataLocations.ts`, CLAUDE.md). **Trade-off (accepted):** users lose all app data when they change phones, restore a phone from a backup, or uninstall and reinstall. CSV export (D14, entries only: no profile photo, bio or settings, §3.9) is the only way to take data along; delete-all (D30) is the way to erase it. Privacy text (README and the in-app note, D21) says so. ADR 006. |
| D50 (owner, Rev 7) | **No Face ID usage string:** `faceIDPermission: false` in the `expo-secure-store` plugin entry. | v2 uses no biometrics (SecureStore without `requireAuthentication`). The plugin passes the option to `IOSConfig.Permissions.createPermissionsPlugin`; `applyPermissions` deletes `NSFaceIDUsageDescription` when the value is `false` (Verification log, Rev 7). If biometrics or `requireAuthentication` are ever added, this must be revisited: iOS requires the string before Face ID is used. |

**N1 (Q12, informational, no decision).** The owner acknowledged that Anthropic prefers its official SDK and that the SDK's Hermes compatibility is **unverified**. Under D23 all HTTP goes through the shared Axios instance, so v2 uses raw Messages API calls via Axios, not `@anthropic-ai/sdk`. No follow-up needed.

---

## 1. Features & user flows

### 1.1 App shell and startup

| Behavior | Old source |
|---|---|
| The splash screen is held with `SplashScreen.preventAutoHideAsync()` at module scope. | `app/_layout.tsx:14` |
| A mount effect runs `initDatabase()`, `initProfile()` and `initDiaryPrompts()` synchronously, then `setIsReady(true)` and `SplashScreen.hideAsync()`. | `app/_layout.tsx:38-44` |
| Until ready, a full-screen white overlay shows `clouds_spinner.gif` (979,223 bytes) at 200×200 via `expo-image`. | `app/_layout.tsx:63-72,77-88`; `assets/images/clouds_spinner.gif` |
| Native splash: `clouds.jpg`, `resizeMode: cover`, white background (black in dark mode). | `app.json:34-45` |
| Root `Stack` with `headerShown: false` holds a single `(drawer)` screen. `unstable_settings.anchor = '(drawer)'`. | `app/_layout.tsx:16-18,57-59` |
| Provider order: `GestureHandlerRootView` → `ThemeProvider` (app) → `PaperProvider` (themed). | `app/_layout.tsx:54-62,30-33` |
| A notification tap (any response) runs `router.navigate('/')`. | `app/_layout.tsx:46-51` |

### 1.2 Navigation map

| Route (file) | URL | How the user reaches it |
|---|---|---|
| `app/(drawer)/(tabs)/index.tsx` | `/` | Home tab, drawer "Home", notification tap |
| `app/(drawer)/(tabs)/dashboard.tsx` | `/dashboard` | Dashboard tab, drawer "Dashboard" |
| `app/(drawer)/diary.tsx` | `/diary` | Drawer "Diary" |
| `app/(drawer)/profile.tsx` | `/profile` | Drawer "Profile" |
| `app/(drawer)/settings.tsx` | `/settings` | Drawer "Settings"; "Open Settings" on the Chat no-key card |
| `app/(drawer)/chat.tsx` | `/chat?initialPrompt=…` | Only from the Home post-submit dialogs (`index.tsx:181,192`) or a deep link `moodbuddy://chat?initialPrompt=…` (scheme at `app.json:8`). It is **not** in the drawer menu (`app/(drawer)/_layout.tsx:18-24`). |

- The drawer uses custom content: a "Mood Buddy" title, a close (X) button, and 5 items with Ionicons. The active item is highlighted when `pathname === item.href` (`app/(drawer)/_layout.tsx:72-115`). Every screen opens the drawer with a hamburger `Appbar.Action` that calls `navigation.dispatch(DrawerActions.openDrawer())` (e.g. `index.tsx:213-217`).
- The tabs (Home, Dashboard) use `HapticTab`, which gives light haptics on iOS (`app/(drawer)/(tabs)/_layout.tsx:20`; `components/haptic-tab.tsx:9-15`). The tab bar background is hard-coded to `#FFFFFF` (`(tabs)/_layout.tsx:16`).
- Home and Dashboard are reachable from both the tab bar and the drawer (`_layout.tsx:19-20` and `(tabs)/_layout.tsx:23-40`).

### 1.3 Home: mood check-in (`app/(drawer)/(tabs)/index.tsx`)

| Step | Behavior | Lines |
|---|---|---|
| Pick values | Three `EmojiPicker` rows: "How are you feeling today?" (mood), "How is your stress level?" (stress), "How is your anxiety level?" (anxiety). Each scale is 1–5. | 225-259 |
| Stress notes | Shown when `stress <= 2` (old scale: 1 Overwhelmed, 2 Stressed). Label: "What do you think is stressing you out?". 3 outlined inputs with placeholder `Stressor n`, `maxLength={50}`, and an `n/50` counter. | 95, 235-254 |
| Anxiety notes | Shown when `anxiety <= 2`. Label: "Have you thought about what is triggering your anxiety?". 3 inputs with placeholder `Trigger n`, max 50 characters. | 96, 261-280 |
| Clearing notes | Picking a value above 2 clears that section's notes. | 200-208 |
| Submit (sticky footer) | If any of the three is unset, it shows `Alert('Incomplete', 'Please select your mood, stress, and anxiety levels before submitting.')`. | 133-137, 283-293 |
| Persist | Inserts a `mood_entries` row with `timestamp = new Date().toISOString()` (UTC). Notes are trimmed, and empty notes become `null`. Notes are saved only if their section is visible. | 139-150 |
| Diary prompt | Builds the prompt text (§3.4) and inserts it into `diary_prompts`. | 152-153 |
| Reset | All picker and note state is cleared. | 156-160 |
| AI flow 1–2 (first time, `ai_chat_prompt_shown` ≠ `'true'`) | A non-dismissable Paper Dialog: "Chat about your feelings?" / "Would you like the option to chat about your feelings with AI after logging your mood?". **Yes** sets `ai_integration_enabled = 'true'` and `ai_chat_prompt_shown = 'true'`, then `router.push('/chat', {initialPrompt})`. **No Thank You** sets `ai_chat_prompt_shown = 'true'` and shows `Alert('Saved!', 'Your mood has been recorded.')`. | 162-167, 177-188, 296-305 |
| AI flow 3 (prompted before, AI enabled) | Dialog "Talk about your mood?" / "Would you like to chat about how you're feeling today?". **Yes** pushes `/chat` with `initialPrompt`. **No** shows the "Saved!" alert. | 168-170, 190-198, 307-316 |
| AI flow 4 (prompted before, AI disabled) | "Saved!" alert. | 171-174 |

The **Yes** path in flow 1 enables AI even when no API key is set, so the user lands on Chat's "API Key Required" card (`chat.tsx:207-234`).

### 1.4 Dashboard (`app/(drawer)/(tabs)/dashboard.tsx`)

| Feature | Behavior | Lines |
|---|---|---|
| Range selector | Week / Month / Year custom segmented control (three `TouchableOpacity` buttons, `dashboard.tsx:74-89`; not Paper `SegmentedButtons`). Default `week`. | 42-91, 308 |
| Data load | On every focus it loads entries in `[now − 366 days, now]` and all distinct local entry dates. | 312-319 |
| Visible filter | Week: `now − 7d`. Month: `now − 28d`. Year: `now − 366d`. These are measured from the current moment, not from the start of a day. | 321-328 |
| Cards | Mood bars (theme primary). Stress bars (`#E07B7B`). Top Stressors word cloud. Anxiety bars (`#7BA8D4`). Top Anxiety Triggers word cloud. Daily Streak. | 362-390 |
| Bar chart | Chart height 148, max bar height 108. Bar height is `max(value/5*108, 5)`. A rounded-average emoji sits above each bar. An empty bucket shows a 4px tertiary stub. | 39-40, 93-176 |
| Word cloud | Top 5 words. Empty-state text: "No stressor notes yet — high-stress days unlock this." / "No anxiety notes yet — high-anxiety days unlock this." | 178-229, 333-342, 374, 384 |
| Streak | 🔥 + count. "1 day in a row" / "n days in a row". At 0 it adds the hint "Log your mood today to start your streak!". | 231-274 |

### 1.5 Diary (`app/(drawer)/diary.tsx`)

| Feature | Behavior | Lines |
|---|---|---|
| Default range | Today to today (`todayDate` is memoized once when the screen mounts). | 388-389 |
| Range calendar | Custom month grid starting on Sunday, with ‹ › month navigation. The first tap sets a pending start and clears the range. Tapping the same day makes a single-day range. A second, different day makes a range, swapped if needed. | 56-110 |
| Max range | More than 30 days inclusive shows `Alert('Range too large', 'Please select a date range of up to 30 days.')`. The pending start is kept. | 26-28, 103-106 |
| Future dates | Selectable, with no guard. | 141-196 (no check) |
| Range label | `Mon D, YYYY` or `start – end`. With only a pending start, the hint reads "Tap a date to start, then tap another to select a range". | 372-374, 400-404, 428-432 |
| List | Prompts in `[start 00:00 local, end 23:59:59.999 local]`, newest first. Each card shows `toLocaleDateString('en-US', …) + " at " + toLocaleTimeString('en-US', …)` and the prompt text. | 376-381, 391-398, 438-443 |
| Empty | "No diary entries for this period." | 434-436 |

### 1.6 Chat (`app/(drawer)/chat.tsx`)

| Feature | Behavior | Lines |
|---|---|---|
| Key gate | The API key is read once in a `useState` initializer. With no key, a card shows "API Key Required" (explaining it is separate from a Claude.ai subscription) with an **Open Settings** button that pushes `/settings`. | 140, 207-234 |
| Initial prompt | On mount, if a key **and** `initialPrompt` exist, the prompt is sent as the first `user` turn **without being shown in the UI**. It is guarded by the `initialized` ref and the effect's empty dependency list. | 163-171 |
| Send | Trimmed text is appended to the API history and shown as a user bubble. Sending is blocked while loading. | 197-205 |
| Response | An assistant bubble on success. On error, a red "error" bubble shows the raw `err.message`. | 173-195 |
| Loading | Spinner plus "Thinking…". The input is disabled. | 283-288, 299 |
| History | In-memory `useRef` only. It is lost on unmount. | 145 |
| Keyboard | iOS uses `KeyboardAvoidingView` with `padding`. Android adds manual `paddingBottom` equal to the keyboard height via `Keyboard` listeners. | 152-161, 248-252 |
| Back | `Appbar.BackAction` calls `navigation.goBack()`. | 216, 244 |
| AI toggle | **Not checked.** Chat works whenever a key exists, even if "Talk to AI Integration" is off. | 130-205 |

### 1.7 Profile (`app/(drawer)/profile.tsx`)

| Feature | Behavior | Lines |
|---|---|---|
| View mode | Avatar (RN `<Image>`, 120px circle, or an account icon placeholder), the bio (or "Tap the pencil to add a bio…"), and a "Daily Inspiration" card. | 206-261 |
| Edit mode | A pencil action enters edit mode. X cancels and ✓ saves. Bio is a multiline `TextInput` cut to `BIO_LIMIT = 1000` by slicing, with an `n / 1000` counter. | 23, 142-157, 191-198, 227-242 |
| Photo | Tappable only in edit mode. Calls `requestMediaLibraryPermissionsAsync`. If denied: `Alert('Permission needed', 'Allow access to your photo library to set a profile picture.')`. Otherwise `launchImageLibraryAsync({mediaTypes:'images', allowsEditing:true, aspect:[1,1], quality:0.8})` and stores `assets[0].uri`. | 159-177 |
| Persistence | The profile row is reloaded on focus. Save writes `bio` and `photo_uri`. | 134-140, 152-157 |
| Daily Inspiration | `fetch('https://zenquotes.io/api/random')` on mount. Shows `"q"`, `— a`, and "Powered by ZenQuotes.io". Errors are swallowed, so it shows "Loading…" forever. | 125-132, 250-261 |

### 1.8 Settings (`app/(drawer)/settings.tsx`)

| Section | Behavior | Lines |
|---|---|---|
| Theme | Swatches for Water, Lavender and Sage. Tapping one calls `setThemeName`, which persists the `theme` setting. | 19-57; `context/ThemeContext.tsx:52-55` |
| Notifications | A "Remind me to check in" switch. Turning it on asks for permission first; if denied: `Alert('Permission Required', 'Please allow notifications in your device settings to receive daily reminders.')`. When on, it shows "What time would you like to check in each day?". iOS shows an inline `spinner` picker; Android shows a button with `h:mm AM/PM` that opens the dialog picker. Default time is 18:00. | 77-171 |
| AI | A "Talk to AI Integration" switch that persists immediately. "Anthropic API Key" is a masked `TextInput` with an eye toggle and placeholder `sk-ant-api03-…`. It is saved, trimmed, **on every keystroke**. Hint: "Get your key at console.anthropic.com — separate from your Claude.ai subscription." | 175-221 |

---

## 2. Data

### 2.1 Storage (old)

| Store | Detail | Source |
|---|---|---|
| SQLite file | `moodbuddy.db`, opened with `openDatabaseSync` **at module import**. The settings table is created at import "because ThemeContext needs it synchronously". | `lib/database.ts:3-6` |
| API | Sync only (`execSync`, `runSync`, `getAllSync`, `getFirstSync`). | `lib/database.ts` throughout |
| Schema versioning | None (no `PRAGMA user_version`). An ad-hoc column check adds `*_note_1..3` and copies the legacy `stress_note`/`anxiety_note`, but never drops the legacy columns. | `lib/database.ts:38-53` |
| Indexes / FKs | None. | `lib/database.ts:23-37,86-93,129-135` |
| Secrets | `anthropic_api_key` is plain text in the `settings` table. | `settings.tsx:190`; `lib/database.ts:118-120` |
| Profile photo | Stores the URI returned by the picker. That is probably a cache-directory file; the cache location is **unverified**. | `profile.tsx:175`, `lib/database.ts:103-108` |

### 2.2 Tables (old, reference only per D1)

| Table | Columns | Source |
|---|---|---|
| `settings` | `key TEXT PRIMARY KEY, value TEXT NOT NULL` | `lib/database.ts:6` |
| `mood_entries` | `id INTEGER PK AUTOINCREMENT, timestamp TEXT NOT NULL` (UTC ISO), `mood INTEGER NOT NULL, stress INTEGER NOT NULL, stress_note_1..3 TEXT, anxiety INTEGER NOT NULL, anxiety_note_1..3 TEXT` | `lib/database.ts:22-37` |
| `profile` | `id INTEGER PK CHECK (id = 1), bio TEXT NOT NULL DEFAULT '', photo_uri TEXT`. Seeded with `INSERT OR IGNORE (1,'',NULL)`. | `lib/database.ts:85-94` |
| `diary_prompts` | `id INTEGER PK AUTOINCREMENT, timestamp TEXT NOT NULL, prompt TEXT NOT NULL`. **No link to `mood_entries`.** | `lib/database.ts:128-136` |

### 2.3 Settings keys (old)

| Key | Values | Written at | Read at |
|---|---|---|---|
| `theme` | `lavender` \| `sage` \| `water` (default `lavender`) | `ThemeContext.tsx:54` | `ThemeContext.tsx:42-46` |
| `reminder_enabled` | `'true'`/`'false'` | `settings.tsx:90` | `settings.tsx:81` |
| `reminder_hour` / `reminder_minute` | integer strings, default `18` / `0` | `settings.tsx:116-117` | `settings.tsx:83-84` |
| `ai_integration_enabled` | `'true'`/`'false'` | `index.tsx:178`, `settings.tsx:185` | `index.tsx:162`, `settings.tsx:179` |
| `ai_chat_prompt_shown` | `'true'` | `index.tsx:179,185` | `index.tsx:163` |
| `anthropic_api_key` | the user's key, plain text | `settings.tsx:190` | `chat.tsx:140`, `settings.tsx:180` |

### 2.4 TypeScript types (old)

| Type | Source |
|---|---|
| `MoodEntry` (columns above) | `lib/database.ts:8-20` |
| `Profile { bio; photo_uri }` | `lib/database.ts:80-83` |
| `DiaryPrompt { id; timestamp; prompt }` | `lib/database.ts:122-126` |
| `MoodOption { value; label; emoji }` | `constants/mood-data.ts:1-5` |
| `RangeType`, `BarData` | `lib/dashboard-utils.ts:4-9` |
| `ChatMessage { role: 'user'\|'assistant'; content }` | `lib/claude.ts:3-6` |
| `ThemeName`, `ThemePalette` | `constants/theme.ts:3-11` |

### 2.5 Query helpers (old)

| Function | Used? | Source |
|---|---|---|
| `insertMoodEntry` | Home | `lib/database.ts:56-67` |
| `getAllEntries` | **unused** | `lib/database.ts:69-71` |
| `getEntriesForDateRange(startISO, endISO)` (ASC, string compare) | Dashboard | `lib/database.ts:73-78` |
| `getProfile` / `saveProfile` | Profile | `lib/database.ts:96-108` |
| `getSetting` (swallows errors and returns null) / `setSetting` (`INSERT OR REPLACE`) | many | `lib/database.ts:110-120` |
| `insertDiaryPrompt` (inserts, then purges anything older than 90 days) | Home | `lib/database.ts:138-146` |
| `getAllDiaryPrompts` | **unused** | `lib/database.ts:148-150` |
| `getDiaryPromptsForRange` (DESC) | Diary | `lib/database.ts:152-157` |
| `getAllEntryDates` (distinct local `YYYY-MM-DD`; reads **every** row) | Dashboard | `lib/database.ts:159-170` |

### 2.6 External APIs

**Anthropic Messages** (`lib/claude.ts`)

| Field | Old value | Lines |
|---|---|---|
| URL | `POST https://api.anthropic.com/v1/messages` | 1, 20-21 |
| Headers | `Content-Type: application/json`, `x-api-key: <user key>`, `anthropic-version: 2023-06-01` | 22-26 |
| Body | `{ model: 'claude-opus-4-8', max_tokens: 512, system: SYSTEM_PROMPT, messages }` | 27-32 |
| System prompt | "compassionate mental wellness companion in the Mood Buddy app… under 150 words… You are not a therapist — just a caring companion." | 8-14 |
| Success | Returns the first `content` block with `type === 'text'`, or throws `'No text response received.'`. | 44-49 |
| Error | Non-2xx throws `body.error.message` or `Request failed (<status>)`. | 35-42 |
| Missing | No streaming, timeout, retry, abort, `stop_reason` handling, or history trimming. | whole file |
| Docs mismatch | README says `claude-sonnet-4-6`; the code uses `claude-opus-4-8`. | `README.md:49` vs `lib/claude.ts:28` |

v2 target per D2: `model: 'claude-sonnet-5-5'` (verified). Before implementation, check these against the Anthropic docs. They come from the `claude-api` reference, not from a docs page:

- Sonnet 5.5 runs **adaptive thinking by default**. Thinking tokens may eat into a 512 `max_tokens` budget, so test the cap or set a low effort.
- It can return `stop_reason: "refusal"`, which must be handled. The old code would surface "No text response received." or an empty reply.
- Anthropic recommends its official SDK over raw `fetch`. Whether `@anthropic-ai/sdk` runs cleanly on Hermes/React Native is **unverified**; per N1/D23, v2 calls the API through Axios instead.

**ZenQuotes**

| Field | Value | Source |
|---|---|---|
| URL | `GET https://zenquotes.io/api/random` | `profile.tsx:126` |
| Response used | `[{ q: string, a: string }]` (first element) | `profile.tsx:123,128-129` |
| Attribution shown | "Powered by ZenQuotes.io" | `profile.tsx:256` |
| Rate limits / terms | **unverified**. Not checked against zenquotes.io terms. | — |

README claims "The only external network call the app makes is to the Anthropic API" (`README.md:92`). That is false, because of ZenQuotes.

### 2.7 Proposed v2 data model

| Store | Contents |
|---|---|
| `expo-sqlite` (`openDatabaseSync`/`openDatabaseAsync`, `SQLiteProvider` + `useSQLiteContext` with `onInit`, `PRAGMA user_version` migrations — all confirmed in v57 docs) | `mood_entries`: same columns as old, stress and anxiety in the **new** direction (D4), **plus** `tz_offset_min INTEGER NOT NULL` (minutes east of UTC at write time, i.e. `-new Date().getTimezoneOffset()`, D20). `diary_prompts`: `id`, **`entry_id INTEGER NOT NULL REFERENCES mood_entries(id) ON DELETE CASCADE`** (D18; NOT NULL is safe because v2 starts fresh, D1), `timestamp`, `tz_offset_min` (copied from the entry), `prompt`. `profile` as before. Indexes on `mood_entries(timestamp)`, `diary_prompts(timestamp)` and `diary_prompts(entry_id)`. **Local date of a row** = its UTC `timestamp` shifted by its own `tz_offset_min` (SQLite `date(timestamp, tz_offset_min \|\| ' minutes')`, i.e. `'540 minutes'` / `'-300 minutes'`, verified on Node's SQLite in Rev 5; or in JS via `src/utils/dates.ts`). An extra stored `local_date TEXT` column is an optional indexing optimization. **Rule:** SQLite ignores foreign keys (so `ON DELETE CASCADE` does nothing) unless `PRAGMA foreign_keys = ON` runs on **every connection**; `onInit` must execute it first, before the `PRAGMA user_version` migrations, and any other connection opened elsewhere must do the same. |
| `react-native-mmkv` (D23) | Non-secret settings, flags and small caches. Keys in §2.8. Replaces both the old `settings` table and the earlier `expo-sqlite/kv-store` option. |
| `expo-secure-store` | `anthropic_api_key` only. API: `getItemAsync`/`setItemAsync`/`deleteItemAsync`, with sync variants (v57 docs). The key never enters Redux, MMKV or logs. Redux holds only a `hasApiKey` boolean, **derived from SecureStore at startup** (before the JS splash fades, §3.11) and updated on Save/Remove; it is **never persisted to MMKV** (§2.8, §6.1). |
| Profile photo | Copy into a document-directory `File` (`new File(Paths.document, …)`, expo-file-system v57 docs). Store that path, not the picker URI. |
| Export temp file | `new File(Paths.cache, 'mood-buddy-export-….csv')`, deleted after sharing (D14, §3.9). |

**Backups (D49).** None of these stores is included in an OS backup. iOS: SQLite (`Documents/SQLite`), MMKV (`Documents/mmkv`) and the profile photo (document directory) sit in directories flagged excluded at every launch by `modules/no-backup`; the export file is in the cache directory, which iOS never backs up. Android: `allowBackup=false`, plus expo-secure-store's extraction rules limiting any device-to-device transfer to shared preferences. SecureStore's keychain item (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) never moves to another device. Keep SQLite and MMKV on their default directories so the exclusion keeps covering them.

### 2.8 v2 settings keys and delete-all effect (D23, D30)

| Store / key | Contents | Delete-all (D30) |
|---|---|---|
| MMKV `theme` | `lavender` \| `sage` \| `water` (default `lavender`) | Kept |
| MMKV `reminder_enabled`, `reminder_hour`, `reminder_minute` | as old (default `false`, 18, 0) | Kept; reminder window rescheduled (§3.6) |
| MMKV `ai_integration_enabled` | boolean | **Kept** (confirmed, D43). Harmless after the key is removed: no AI prompt shows until a key exists (D19) and Chat needs a key (§3.10). |
| MMKV `ai_chat_prompt_shown` | boolean | **Kept** (confirmed, D43) |
| MMKV `reminder_tz`, `tz_change_detected_at` | IANA zone the current reminder window was built for; when a different zone was first seen (D20) | Kept |
| MMKV `quote_cache` | `{ q, a, localDate }` last good ZenQuotes response (D21) | Kept (third-party content, not user content) |
| MMKV `install_initialized` | boolean, set after the first-run cleanup below | Kept |
| SecureStore `anthropic_api_key` | the user's key | **Deleted** (`deleteItemAsync`; needed on iOS, where keychain items survive reinstall) |
| Redux `settings.hasApiKey` (memory, derived) | whether a key is stored; read from SecureStore at startup, never written to MMKV | **Reset to `false`** |
| SQLite `mood_entries`, `diary_prompts`, `profile` | user content | **Deleted** (profile reset to empty bio, no photo) |
| Document-dir profile photo file | user content | **Deleted** |
| Cache-dir export files | temp | **Deleted** (sweep) |
| Redux `chat` slice (memory) | conversation and pending handoff | **Cleared**; any in-flight Anthropic request is **aborted first** (§3.10) |
| TanStack Query cache | local-data and quote queries | Local-data queries invalidated |

**First-run keychain cleanup (architect default).** On iOS, keychain items survive uninstall, but MMKV (app sandbox) does not. At startup, if MMKV `install_initialized` is absent, call `deleteItemAsync('anthropic_api_key')` before deriving `hasApiKey`, then set the flag. This removes an orphaned key left by a previous install of v2. Harmless on Android (nothing to delete). Because the item is `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, it never restores onto a different device (D49).

---

## 3. Business rules

### 3.1 Scales (old, `constants/mood-data.ts`)

| Value | Mood (1 = worst) | Stress (old: 1 = worst) | Anxiety (old: 1 = worst) |
|---|---|---|---|
| 1 | Upset 😭 | Overwhelmed 😱 | Panicked 😨 |
| 2 | Unhappy 😟 | Stressed 😤 | Anxious 😰 |
| 3 | Neutral 😐 | Okay 😐 | Neutral 😐 |
| 4 | Content 😊 | Chill 😌 | Relaxed 🙂 |
| 5 | Happy 😄 | Stressfree 🤩 | Calm 😌 |

Lines: mood 7-13, stress 15-21, anxiety 23-29.

**v2 stored values (D4, D39).** This table defines what each stored number means. Each emoji stays with its label.

| Value | Mood (1 = worst, 5 = best) | Stress (1 = least, 5 = most) | Anxiety (1 = least, 5 = most) |
|---|---|---|---|
| 1 | Upset 😭 | Stressfree 🤩 | Calm 😌 |
| 2 | Unhappy 😟 | Chill 😌 | Relaxed 🙂 |
| 3 | Neutral 😐 | Okay 😐 | Neutral 😐 |
| 4 | Content 😊 | Stressed 😤 | Anxious 😰 |
| 5 | Happy 😄 | Overwhelmed 😱 | Panicked 😨 |

**v2 display order (D48).** Left to right, the worst state is on the left and the best on the right in every row. Mood renders values 1 → 5; stress and anxiety render values **5 → 1**.

| Position (left → right) | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|
| Mood (value) | Upset 😭 (1) | Unhappy 😟 (2) | Neutral 😐 (3) | Content 😊 (4) | Happy 😄 (5) |
| Stress (value) | Overwhelmed 😱 (5) | Stressed 😤 (4) | Okay 😐 (3) | Chill 😌 (2) | Stressfree 🤩 (1) |
| Anxiety (value) | Panicked 😨 (5) | Anxious 😰 (4) | Neutral 😐 (3) | Relaxed 🙂 (2) | Calm 😌 (1) |

Implementation rule: the scale constants in `src/constants/` stay in **value order** (1 → 5) for every metric, matching the stored meaning; each scale also declares its display direction (`ascending` for mood, `descending` for stress and anxiety), and `EmojiPicker` renders the options in that direction. Nothing reverses values; only the rendering order changes.

### 3.2 D4/D39/D48 knock-on effects (stress and anxiety: 1 = least, 5 = most; rendered 5 → 1)

| Area | Old behavior (source) | v2 rule |
|---|---|---|
| Option order and emoji | value 1 = Overwhelmed/Panicked (`mood-data.ts:16,24`), rendered in array order (`components/emoji-picker.tsx:64`), so the old app already showed Overwhelmed/Panicked on the left | Values per the stored-value table in §3.1 (D39). **Display order (D48):** mood 1 → 5; stress and anxiety **5 → 1**, so in all three rows the worst state is on the left and the best on the right (Upset/Overwhelmed/Panicked left; Happy/Stressfree/Calm right). The on-screen order therefore matches the old app; only the stored numbers changed. |
| End labels | None | Every row shows end labels under the tiles, matching visual order: mood "Worst" (left) … "Best" (right); stress "Most stress" (left) … "Least stress" (right); anxiety "Most anxiety" (left) … "Least anxiety" (right). Since all rows now share the same good-on-the-right direction, these are clarifying, not a mitigation. The visible end labels are hidden from screen readers (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` on the label row), because each tile's label already carries its direction. |
| Default / unselected state | No tile selected until the user taps (`index.tsx` state starts unset; Incomplete alert at `:133-137`) | Unchanged in every row: **no tile is pre-selected**, no value is implied by position, and submit is blocked until all three are set (§3.3). No note fields show while a row is unselected. |
| Note trigger | `<= 2` (`index.tsx:95-96,121,126`) | `>= 4` on the stored value, i.e. high stress (Stressed/Overwhelmed) or high anxiety (Anxious/Panicked). With the D48 display order these are the **two leftmost** tiles in the stress and anxiety rows, the same positions that showed notes in the old app. Clear notes when the value is `< 4`. The threshold is always evaluated on the stored value, never on tile position. |
| Diary prompt sentences | "My main stressors…" and "My anxiety triggers…" only when `<= 2` (`index.tsx:121,126`) | Only when `>= 4`. The sentence text is unchanged ("My stress level is {label}." uses the label, e.g. "Overwhelmed" for 5), because labels move with their values; no numbers appear in the prompt. |
| Bar height | `value/5*108` (`dashboard.tsx:136-137`) | Unchanged formula on the stored value. A **taller bar means more stress/anxiety**, while a taller mood bar means a better mood. D48 changes tile order only, not charts (the chart x-axis is time). Informational note: on the Dashboard the "good" direction is up for mood and down for stress/anxiety; each card's caption and a11y summary states it: "Taller bar = better mood", "Taller bar = more stress", "Taller bar = more anxiety". |
| Bar colors | `#E07B7B` stress, `#7BA8D4` anxiety (`dashboard.tsx:369,379`) | Keep (they describe the metric, not a direction). Fix contrast (§5.6). |
| Emoji above bar | `emojiForValue(round(avg))`, fallback 😐 (`dashboard-utils.ts:32-34`) | Unchanged logic: the rounded stored value is looked up in the value-ordered scale (§3.1), so display order (D48) does not affect it. |
| Word-cloud source | Notes exist only for high-stress/anxiety entries (because they are only saved when shown, `index.tsx:143-149`) | Same meaning, new threshold (`>= 4`). Empty-state copy stays valid. |
| Averages | Mean of raw values: Week `dashboard-utils.ts:84-94`, Month `:102-108`, Year `:117-123` | Direction doesn't affect the mean (D4). **D31:** Month and Year average **per-day means** (each day collapses to the mean of its entries first), matching Week. See §3.8. |
| Streak | Counts days with any entry (`dashboard-utils.ts:36-55`) | **Unaffected.** |
| A11y labels | None today (`components/emoji-picker.tsx:67-84`) | **One rule for all 15 tiles, word-only.** Row: `accessibilityRole="radiogroup"`, label = the row question. Tile: `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, label = `"{Label}, {direction}"`, with `{direction}` from one per-metric ladder in value order. Mood: worst mood, low mood, middle mood, good mood, best mood. Stress: least stress, low stress, some stress, high stress, most stress. Anxiety: least anxiety, low anxiety, some anxiety, high anxiety, most anxiety. No numbers in any label (the numbers run opposite ways in different rows). Examples: "Overwhelmed, most stress"; "Okay, some stress"; "Happy, best mood". The ladder lives in `src/constants/scales.ts` and is unit-tested. **Screen-reader and keyboard focus order follow visual order** (left to right) in every row: mood Upset → Happy, stress Overwhelmed → Stressfree, anxiety Panicked → Calm (D48). Render the tiles in that order in the view tree so no custom focus ordering is needed. |
| AI context | The prompt gives labels, not numbers (`index.tsx:113-131`) | Unaffected. |
| Tests | `__tests__/constants/mood-data.test.ts` (59 lines) asserts the old ordering: `:38-43` and `:52-57` assert value 1 = Overwhelmed/Panicked and 5 = Stressfree/Calm; `:11` asserts `value === i + 1` | Rewrite against both v2 tables in §3.1: value meaning (D39) and display order (D48). Add a picker test that the rendered order and a11y order are 5 → 1 for stress/anxiety and that tapping the leftmost stress tile stores 5 and shows the note fields. |

### 3.3 Validation

| Rule | Source |
|---|---|
| All three values are required before submit. | `index.tsx:134-137` |
| Each note is at most 50 characters (`maxLength`). Notes are trimmed, and blank becomes `null`. | `index.tsx:143-149,245,271` |
| Notes are saved only if their section is visible at submit. | `index.tsx:143-149` |
| Bio is at most 1000 characters, enforced by slicing on change. Paste beyond the limit is silently cut. | `profile.tsx:23,232` |
| API key is trimmed on save. There is no format check. | `settings.tsx:188-191` |
| Diary range is at most 30 days inclusive (`Math.round(|Δms|/86_400_000)+1`). | `diary.tsx:26-28,103-106` |
| Theme fallback: anything other than `lavender`/`sage`/`water` becomes `lavender`. | `ThemeContext.tsx:42-46` |

**v2 additions**

| Rule | Decision |
|---|---|
| Diary calendar: days after the **upper bound** are disabled (B14); upper bound = max(device today, latest entry local date), per the timezone-travel rule in §3.5 (D46). Days before the 90-day window are disabled: a day is disabled when its whole local day ends before `now − 90 days` (the purge cutoff); the boundary day stays selectable and shows whatever is not yet purged. Disabled cells are announced as "unavailable". | D16 |
| Diary range is still at most 30 days inclusive. | old rule kept |
| Export range: start ≤ end, end ≤ the same upper bound as the Diary (§3.5, D46), no 90-day limit (entries are kept forever). Default range: all time. | D14 |
| API key: trimmed; empty is rejected; a key without the `sk-ant-` prefix gets a warning but can be saved. No network check on Save. | D15 |
| Route params and deep links are untrusted; Chat accepts no prompt text from a URL. | §6.1 |

### 3.4 Diary prompt text (`index.tsx:98-131`)

```
Right now I feel {moodLabel}. My stress level is {stressLabel}.
[My main stressors right now are {list}.] My anxiety level is {anxietyLabel}.
[My anxiety triggers are {list}.] I would like to talk about my feelings and get insight.
```

- `{list}` uses an Oxford comma: "a", "a and b", "a, b, and c" (`index.tsx:98-104`).
- **Edge case:** `buildPrompt` receives the **raw** note state, not the "visible only" values (`index.tsx:152`). This is harmless today, because choosing a value above 2 clears the notes (`index.tsx:200-208`) and the sentence is gated on the value.
- The same text is used as the hidden first chat message (`index.tsx:154,181,192`).

### 3.5 Dashboard calculations (`lib/dashboard-utils.ts`)

| Rule | Lines |
|---|---|
| `localDateStr(d)` gives local `YYYY-MM-DD`. | 22-24 |
| `addDays` uses `setDate`, so it is DST-safe. | 26-30 |
| **Streak:** start from today if logged, else yesterday, else 0. Walk back one day at a time from local **noon** (`T12:00:00`) to avoid DST edges. | 36-55 |
| **Week:** 7 buckets (today − 6 … today). Each is labeled by weekday `Su..Sa` and holds the mean of that local day's entries, or `null`. | 84-94 |
| **Month:** 4 **rolling** 7-day windows ending today, labeled `W1..W4` (W4 = the last 7 days). These are not calendar weeks. | 96-111 |
| **Year:** 12 **calendar** months ending with the current month, labeled `Jan..Dec`. | 113-125 |
| **Word cloud:** lowercase; strip `[^a-z\s]` (so "café" becomes "caf" and non-Latin text vanishes); keep words longer than 2 characters that are not in `STOP_WORDS` (60 words); take the top N by count. Ties keep insertion order. | 14-20, 57-75 |
| Word font is `round(14 + count/max*12)` and opacity is `0.6 + count/max*0.4`. | `dashboard.tsx:215-220` |
| Timestamps are stored in UTC and bucketed in **device-local** time. Tests run with `TZ=UTC` (`package.json:12-13`), so local-time edge cases are untested. | |

**v2 changes**

| Rule | Decision |
|---|---|
| An entry's day is its **write-time local date** (UTC timestamp + stored `tz_offset_min`), not the current device zone. "Today" and range edges use the device's current local date. Streak, Week/Month/Year buckets, Diary ranges and export ranges all use this. | D20 |
| **Timezone travel: entries dated after "today" (D46, agreed by the owner in Q34).** After westward travel, an entry written before the trip can have a stored local date *later* than the device's current local date (e.g. logged 00:30 on the 8th in Tokyo, now 17:00 on the 7th in Hawaii). Rule: (1) for Week/Month/Year buckets and the streak, an entry's day is clamped to `min(entry local date, device today)`, so it counts as **today**; (2) when a reschedule asks "is there an entry today?" (§3.6), entries with local date ≥ device today count as today, so today's reminder stays skipped; (3) Diary and export upper bounds are `max(device today, latest entry local date)`, so the entry stays reachable; (4) the stored date is never rewritten, and Diary cards and CSV rows still show it. UTC offsets span at most 26 hours, so an entry is at most one or two days "ahead", and the clamp stops mattering once device today catches up. | D20 |
| Month and Year: average per-day means (§3.2). | D31 |
| **Word cloud tokenization:** lowercase with `toLowerCase()`, split on anything that is not a Unicode letter (`/[^\p{L}]+/u`), keep words whose length in code points (`[...w].length`) is > 2 and not in `STOP_WORDS`. So "café" stays "café" and non-Latin words survive. Known limits: `STOP_WORDS` is English only; scripts without spaces (e.g. Chinese, Japanese) yield whole phrases, not words. | D22 |
| **Hermes check (unverified):** `\p{L}` with the `u` flag must be confirmed on a device build, since Jest runs on Node. Fallback if unsupported: split on whitespace and strip only ASCII punctuation and digits, leaving every other character in place. | D22 |

### 3.6 Notifications

**Old rules**

| Rule | Source |
|---|---|
| Notification ID `mood_daily_checkin`, category `MOOD_LOG` with action `LOG_MOOD` "Log Mood" (`opensAppToForeground`). **v2: drop** the category and action (architect recommendation): the action does exactly what a plain tap does (open the app, route to Home), and dropping it removes category registration from startup. | `lib/notifications.ts:4-5,25-31` |
| Content: title "Time to check in 🌿", body "How are you feeling today?". | `lib/notifications.ts:35-39` |
| `DAILY` trigger `{hour, minute}`, **no `channelId`**. | `lib/notifications.ts:40-44` |
| Android channel `mood-checkin` ("Daily Check-in", DEFAULT importance) is created only inside the permission request. | `lib/notifications.ts:8-13` |
| Scheduling cancels the previous reminder first, and cancel errors are swallowed. | `lib/notifications.ts:22-23,48-50` |
| The foreground handler sets `shouldShowAlert`, `shouldPlaySound`, `shouldShowBanner` and `shouldShowList` to true and `shouldSetBadge` to false. | `app/_layout.tsx:20-28` |
| Any notification response navigates to `/`. | `app/_layout.tsx:46-51` |
| The reminder fires even if the user already checked in that day. | (no check anywhere) |

**v57 doc facts** (`docs.expo.dev/versions/v57.0.0/sdk/notifications`, fetched 2026-10-06):

- `shouldShowAlert` is **deprecated**. Use `shouldShowBanner` and/or `shouldShowList`.
- `DailyTriggerInput` and `DateTriggerInput` both accept an optional `channelId`.
- Trigger types include `DATE`, `DAILY`, `TIME_INTERVAL`, `CALENDAR` (iOS) and `WEEKLY/MONTHLY/YEARLY`.
- For cold start, the docs list `useLastNotificationResponse()`, `getLastNotificationResponse()`, `getLastNotificationResponseAsync()` and `clearLastNotificationResponseAsync()`. The Expo Router example calls `getLastNotificationResponse()` inside the observer effect, then adds the response listener.
- The `defaultChannel` plugin option is "Default channel for FCMv1 notifications" (remote push only). It does not route local notifications.

**D9: skip the reminder on days the user already checked in**

A repeating `DAILY` trigger fires whatever the app's state, so it cannot skip a day. The options considered (**B adopted**, with N = 14 per D28):

| Option | How it works | Pros | Cons |
|---|---|---|---|
| A. `DAILY` trigger + in-app suppression | Keep the repeating trigger. Try to suppress at display time. | Simple | It cannot be suppressed: the OS shows a scheduled local notification without running JS (the foreground handler only applies while the app is open). **Rejected.** |
| **B. Rolling one-shot `DATE` triggers (adopted)** | Keep a window of **N = 14** one-shot reminders (D28) with `channelId: 'mood-checkin'`. Each request gets an ID with a common prefix (e.g. `mood_checkin_<fireAtMs>`) and carries its trigger instant in `content.data.fireAt` (epoch ms). Logic never derives "which day" from the ID. On **every check-in**, cancel every pending reminder whose `fireAt` falls before the end of the device's current local day (found via `getAllScheduledNotificationsAsync()`; see the check-in rule below). On **app start/foreground** and on **settings change**, cancel everything and reschedule (subject to the timezone grace rule below). After **delete-all** (D30: reminder settings are kept), cancel everything and reschedule the full window; today is included only if the reminder time hasn't passed (there is no entry any more). In every reschedule, today is included only if there is no entry yet today **and** the reminder time hasn't passed. | Exact "skip if checked in" for the current day. Works offline. No background execution. | Reminders stop after 14 days if the app is never opened; the last one uses the normal text (D42). Timezone handling below. iOS caps pending local notifications (commonly cited as 64; **unverified**; 14 is well below it). |
| C. Background task | `expo-background-task` checks for today's entry and schedules. | | OS-throttled timing, so it is unreliable for a fixed-time reminder. **Rejected.** |

**Timezone and DST (D20, reading confirmed by D37)**

| Case | Rule |
|---|---|
| Scheduling | Each trigger date is computed from local wall-clock time in the current zone, so DST shifts inside one zone are already correct. Store the zone as `reminder_tz`. |
| Detecting a change | On app start/foreground, compare the current IANA zone with `reminder_tz` (zone name, not offset, so DST doesn't count). Zone source: `Intl.DateTimeFormat().resolvedOptions().timeZone` on Hermes or `expo-localization` `getCalendars()[0].timeZone`; both **unverified** for v57/Hermes. |
| Grace period | On first detection, record `tz_change_detected_at` and keep the existing schedule. Pending triggers are absolute instants, so for up to 24 hours they fire at the old zone's wall time. |
| Third zone during grace | If the device moves to yet another zone (neither `reminder_tz` nor the zone first detected) while grace is running, `tz_change_detected_at` is **not** reset: the 24-hour timer always runs from the **first** detection. Only `tz_change_detected_at` is stored (not the detected zone), so this needs no extra key. The post-grace reschedule uses whatever zone is current at that moment. |
| Reschedule | At the first app start/foreground **≥ 24 hours** after detection, cancel all and reschedule for the current zone, then set `reminder_tz` and clear `tz_change_detected_at`. If the user goes back to the `reminder_tz` zone before then, clear `tz_change_detected_at`. No background execution, so this needs the app to be opened. |
| What reschedules during grace (clarified) | **Nothing reschedules during the grace period except a reminder settings change.** App start/foreground does not reschedule (it only checks whether 24 hours have passed). A settings change reschedules the full window in the **current** zone and ends the grace period (sets `reminder_tz` to the current zone, clears `tz_change_detected_at`). |
| Delete during grace (D47, accepted by the owner in Q35) | Deleting today's last entry (§3.8) or delete-all (§2.8) during grace does **not** restore a reminder the check-in already cancelled; it waits for the post-grace reschedule. Cost: at most one missed reminder inside the 24 hours. This keeps the "no reschedule except settings change" rule simple. Outside grace, both behave as in option B. |
| Check-in (any time, including grace) | Read `getAllScheduledNotificationsAsync()`, and cancel (`cancelScheduledNotificationAsync(id)`) every request with our ID prefix whose `content.data.fireAt` is before the end of the device's current local day (`new Date()` → next local midnight via `setHours(24, 0, 0, 0)`). This works whatever zone the window was built in, because it compares absolute instants. `fireAt` is read from our own `data` rather than the returned trigger object, whose per-platform shape for `DATE` triggers is **unverified**. No date library is needed: every computation is either "wall time in the device's current zone" (JS `Date`) or an absolute instant; nothing computes wall time in a zone other than the device's. |

On tap, open `/` (Home). In v2, register the response observer in the root layout and handle cold start with `getLastNotificationResponse()` / `useLastNotificationResponse()` as the v57 docs show. Clear the stored response after handling it, so a later relaunch does not navigate again. Under D35, `/` is the Home tab inside Drawer → Tabs; if Chat (a root Stack screen, §6.1) is on top, the tap must also dismiss it (navigation behavior for this case is **unverified**, see §6.1).

### 3.7 Data retention

| Data | Rule | Source |
|---|---|---|
| Diary prompts | Purge prompts older than 90 days (`90*24*60*60*1000` ms) **only when a new prompt is inserted**. With no new check-ins, old prompts linger. | `lib/database.ts:138-146` |
| Mood entries | Kept forever. | (no purge) |
| Chat | Memory only. | `chat.tsx:145` |

v2:

| Data | Rule | Decision |
|---|---|---|
| Diary prompts | 90-day purge on insert, on app start **and on every foreground** (fixes B15; architect recommendation). Foreground purge keeps the D16 boundary day honest when the app stays in memory across midnight: the calendar's "oldest selectable day" and what is actually stored move together. It is one indexed `DELETE` on `diary_prompts(timestamp)`, so the cost is negligible. Also deleted with their entry (cascade). | D3, D16, D18 |
| Mood entries | Kept until the user deletes them (swipe on Diary, or delete-all). | D5, D18, D30 |
| Chat | Memory only. Cleared only by the next check-in handoff, delete-all, turning the AI toggle off (D44/Q36), or app restart. | D2, D24, D44 |
| Export CSV | Deleted from cache after sharing; leftover export files swept on app start. | D14 |
| Quote cache | Last good quote only, overwritten on each successful fetch. | D21 |

### 3.8 D5 rules: multiple entries per day, delete, export, delete-all

| Area | v2 rule |
|---|---|
| Multiple entries per day | Allowed, as today (no unique constraint, `lib/database.ts:24-36`). Each check-in creates its own entry and its own diary prompt. |
| Week averages | One bar per local day = mean of that day's entries (`dashboard-utils.ts:84-94`). Unchanged. |
| Month / Year averages | Old code averages every entry in the bucket (Month `dashboard-utils.ts:102-108`, Year `:117-123`), so a day with 3 check-ins counts 3x. **D31:** average per-day means, so all ranges weight days equally. |
| Streak after delete | Streak is derived from distinct local dates with any entry (`getAllEntryDates`, `lib/database.ts:159-170`; `dashboard-utils.ts:36-55`), using write-time local dates (D20). Deleting the only entry on a day removes that day, which can shorten or break the streak. Recompute on delete (invalidate the TanStack Query keys for entries and dates, §6.3); never store the streak. |
| Today's reminder after delete | If the deleted entry was today's last one and the reminder time hasn't passed, reschedule today's one-shot reminder (§3.6 option B), except during the timezone grace period (§3.6, D47). "Today's" entries include any dated after device today (§3.5, D46). Deleting a past-day entry does not touch reminders. |
| Linked diary prompt after delete | **D18:** deleted with the entry via `entry_id ... ON DELETE CASCADE` (§2.7, needs `PRAGMA foreign_keys = ON`). |
| Where the user deletes (D18) | **Diary screen, swipe-to-delete** on a prompt card (`ReanimatedSwipeable` from `react-native-gesture-handler`; present in the installed v2 package, API **docs-unverified**). Swiping reveals a Delete action; tapping it opens a Paper `Dialog`: "Delete this check-in?" / "This removes the mood entry and its diary entry. This can't be undone." with **Cancel** and a destructive **Delete**. Delete removes the **entry** (cascade removes the prompt), then invalidates Diary, Dashboard and streak queries. **A11y (WCAG 2.5.1, required):** every card also exposes an accessibility action "Delete" (and a long-press/overflow menu) that opens the same dialog, so no swipe is needed. In FlashList, reset a row's open state on recycle (key by `entry_id`). |
| Entries without a Diary card | Entries older than the 90-day prompt purge have no card and cannot be deleted one by one; only delete-all removes them. Accepted (D36). |
| Export | **D14/D16:** CSV, rules in §3.9. |
| Delete all | **D30:** user content only; key-by-key in §2.8; reminders per §3.6. |

### 3.9 Export (D14, D16)

| Rule | Detail |
|---|---|
| Entry point | Settings → "Export my data" (architect default). |
| Range filter | Start/end local dates, default **all time**; validation in §3.3. Filter on each entry's write-time local date (D20). |
| File layout (confirmed, D34) | One UTF-8 CSV (with BOM so spreadsheet apps detect UTF-8), CRLF line endings, one row per check-in, oldest first. |
| Quoting (architect decision) | RFC 4180 **quote-when-needed**: a field is wrapped in double quotes only if it contains a comma, a double quote, CR or LF; embedded double quotes are doubled (`"` → `""`). All other fields are written bare. Chosen over always-quote because it keeps numeric columns numeric in every spreadsheet and keeps the file diff-friendly; both forms are valid RFC 4180. |
| Header row (exact) | `entry_id,local_date,local_time,utc_timestamp,tz_offset_min,mood (1=worst 5=best),mood_label,stress (1=least 5=most),stress_label,stress_note_1,stress_note_2,stress_note_3,anxiety (1=least 5=most),anxiety_label,anxiety_note_1,anxiety_note_2,anxiety_note_3,diary_prompt` — 18 columns. `local_date`/`local_time` are the write-time local values (D20). |
| Header style (architect decision) | **Descriptive** score headers (as above), not plain `mood`/`stress`/`anxiety`. Reason: the export is for a person opening it in a spreadsheet, and these headers are the only place in the file that states each score's direction, which differs between mood and stress/anxiety (D39). The parentheses and spaces contain no comma, quote, CR or LF, so they are written unquoted under quote-when-needed. All other headers are plain snake_case. |
| Values and display order (D48) | The score columns hold the **stored** values (D39), so the CSV is unaffected by the 5 → 1 on-screen order of stress and anxiety. Headers and values are unchanged by D48. |
| Prompts | `diary_prompt` holds the linked prompt if it still exists, including prompts about to expire (D16). Purged prompts (> 90 days) leave the cell empty. |
| Not exported | Profile photo (D14). Profile bio (D34). Settings, API key, chat. |
| Security | Guard against CSV formula injection **in user-text cells only**: `stress_note_1..3`, `anxiety_note_1..3` and `diary_prompt` (which embeds the notes). In those cells, prefix `'` to a value starting with `=`, `+`, `-`, `@`, tab or CR. Numeric and generated columns (`entry_id`, dates/times, `utc_timestamp`, `tz_offset_min` — which is negative west of UTC, e.g. `-300` — scores and labels) are written **raw**, so they stay numeric in spreadsheets. The quote-when-needed rule applies to every cell after the prefix is added. Never log the file contents. |
| Write and share | `new File(Paths.cache, 'mood-buddy-export-YYYY-MM-DD.csv').write(...)`, then `Sharing.isAvailableAsync()` and `shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle })`. |
| Cleanup | Delete the file in a `finally` after `shareAsync` settles, and sweep any leftover `mood-buddy-export-*` files from cache on app start. The v57 docs only say `shareAsync` returns `Promise<void>`; whether a receiving app has finished reading the file when it resolves (notably on Android) is **unverified**. Test with Files/Drive/Mail; if a target fails, keep the file until the next app start instead. |
| Heavy work | Building the CSV for a few thousand rows is small; if it shows up in profiling, move it to a worklet runtime (§6.3). |

### 3.10 AI chat gating (D15, D19, D24, D29, D44)

| Rule | Detail |
|---|---|
| Home dialogs need a key **and** (for the "Talk about your mood?" dialog) the toggle on | No key: no dialog, show "Saved!" (D19). Key + not yet prompted: first-time dialog; **Yes** sets `ai_integration_enabled` and `ai_chat_prompt_shown` and hands off; **No** sets `ai_chat_prompt_shown`. Key + prompted + toggle on: "Talk about your mood?". Key + prompted + toggle off: "Saved!". |
| Settings toggle marks "prompted" | Changing the AI toggle in Settings also sets `ai_chat_prompt_shown`, so a user who already chose in Settings is never asked by the first-time dialog (architect default). |
| Chat with toggle off (D29, D44) | Shows an "AI chat is turned off" card with **Open Settings**. Sends nothing. Turning the toggle off (anywhere) aborts any in-flight request, then **discards the in-memory conversation and any pending handoff** (D44/Q36). Turning it back on starts with an empty chat. |
| Chat with no key | Shows the "API Key Required" card (still needed if the key is removed while Chat is in the back stack). Sends nothing. |
| Chat with nothing to show | Toggle on and a key stored, but **no pending handoff and no conversation** (e.g. a cold-start deep link `moodbuddy2://chat`, or after toggle-off/delete-all cleared it): show an empty-state card "Your chat starts after a check-in." with a **Go to check-in** button that dismisses Chat and shows Home. No text input is shown and nothing is sent. Precedence: toggle-off card, then no-key card, then this empty state, then the conversation. Any query params on the link are ignored (§3.3). |
| Cold-start deep link (`moodbuddy2://chat`) | The root layout keeps `export const unstable_settings = { anchor: '(drawer)' }`, as the old app does (`app/_layout.tsx:16-18`), so a cold start straight into `/chat` still mounts the drawer underneath and Back returns to Home instead of exiting. `unstable_settings.anchor` is read by the installed router (`v2:node_modules/expo-router/build/getRoutesCore.js:651-657`); device behaviour **unverified**. |
| Abort in-flight requests | One `AbortController` per Anthropic request, created and owned by the chat **service** (passed to Axios as `signal`). TanStack Query mutations receive no `AbortSignal` (only queries do), so the service keeps the current controller and exposes `abortChat()`. It is aborted on: **toggle-off** (D29, D44), **Remove key** (§6.1), **delete-all** (§2.8, before clearing the slice), **a new check-in handoff** (before clearing the old conversation). Leaving the Chat screen does **not** abort: the conversation outlives the screen (D24), so the reply lands in the `chat` slice. An aborted request adds no assistant or error bubble and never writes into a newer conversation (ignore any late response whose conversation ID no longer matches). |
| Where the reply is written | The reply (or mapped error) is dispatched into the Redux `chat` slice **inside the service / `mutationFn`** (or in `useMutation`-level `onSuccess`/`onError` options), after checking that the conversation ID still matches. **Never** in per-call `mutate(vars, { onSuccess })` callbacks: TanStack Query does not run those if the calling component has unmounted, which would drop replies when the user leaves Chat mid-request (D24). The Chat screen only renders slice state. |
| Key validation (D15) | No request on Save. The first request is the check: 401/403 → "Your API key was rejected. Check it in Settings." with **Open Settings**; 429 → "Too many requests, try again shortly"; 529/overloaded or 5xx → "Claude is busy, try again"; network/timeout → "Couldn't reach Claude". Never show raw API text (B16) or the key. |
| Handoff and lifetime (D24) | Home writes the prompt into the Redux `chat` slice as a pending handoff; Chat consumes it, **aborts any in-flight request, clears the previous conversation**, and sends it as the hidden first user turn. The conversation survives navigation and is cleared only by the next handoff, delete-all, turning the AI toggle off (D44/Q36), or app restart. No URL params carry prompt text. |

### 3.11 Startup and splash (D27, D41)

| Requirement | Detail |
|---|---|
| Clouds kept | Keep `clouds.jpg` and the clouds animation (`clouds_spinner.gif`). Both are **325×529** (`file` on the old assets); `clouds.jpg` looks like a still of the GIF (**unverified** frame match). Re-encode the 979 KB GIF (e.g. animated WebP via `expo-image`) if size or frame rate suffers; visual must stay the same. |
| Target (D41) | The **GIF fills the entire screen**: `contentFit="cover"`, edge to edge, behind the status and navigation bars, no letterboxing, no white bands, portrait, every supported phone size. It is not a small centered graphic. |
| Likely old cause | Native splash plugin: `imageWidth: 200` + `resizeMode: cover` (`app.json:38-39`), so the image is a 200-wide centered graphic. Loading overlay: a 200×200 GIF on white (`app/_layout.tsx:63-72,77-88`). |
| v2 template splash | `v2:app.json:29-34` configures the template splash (`backgroundColor: "#208AEF"`, `image: "./assets/images/splash-icon.png"`, `imageWidth: 76`). It is **replaced** by the plugin config below; the blue colour and `splash-icon.png` are not used. |
| Asset quality | 325×529 has a 0.61 aspect ratio; phones are about 0.46. `cover` therefore crops the left and right edges (about a quarter of the width) and upscales about 5× in device pixels (529 px → about 2,500 px tall on a current 6.1-inch phone), which will look soft. If that is visibly poor on device, source a higher-resolution version of the same animation (owner asset question at implementation, not a spec decision). |

**What each layer can do (honest limits)**

| Layer | iOS | Android 12+ | Android < 12 |
|---|---|---|---|
| Native splash (before JS runs) | A static full-bleed image is possible via the plugin's `ios.enableFullScreenImage_legacy` (v57 docs: "allows using a full screen image… will be removed in the future"; present in the installed plugin source). It cannot animate. | **Cannot be full-screen.** Android's splash API is a single opaque window colour plus a centred icon (288 dp max, masked to a 192 dp circle) and an optional branding image (Android developer docs, fetched 2026-10-07). No full-bleed image, no GIF. | **In scope:** v2's `minSdkVersion` defaults to 24 (baseline table). The installed plugin styles extend `Theme.SplashScreen` (`v2:node_modules/expo-splash-screen/plugin/build/withAndroidSplashStyles.js:10,61`) from `androidx.core:core-splashscreen:1.2.0` (`expo-splash-screen/android/build.gradle:19`), the AndroidX backport of the Android 12 splash API, so Android 7–11 get the same colour + centred icon model. Source-verified; **device-unverified**. Same approach as Android 12+. |
| JS overlay (after JS runs) | Full-screen animated GIF: `expo-image`, `StyleSheet.absoluteFill`, `contentFit="cover"`. | Same. Edge-to-edge is **always on** in SDK 57 (baseline table; `withEdgeToEdge.js:26-27`), so the overlay can draw behind the transparent status and navigation bars without extra config. | Same (edge-to-edge applies on every supported version; check bar appearance on an Android < 12 device). |

| Requirement | Detail |
|---|---|
| Approach (both platforms) | **Native splash = solid background colour, with a fully transparent `image`.** `backgroundColor` = the colour sampled from the GIF's first frame (the dominant sky colour), same on both platforms. `image` = a small, **fully transparent PNG** (e.g. `assets/images/splash-transparent.png`, 1×1 or a square of any size), so the centred icon renders as nothing. Do **not** omit `image`: the installed plugin always sets `windowSplashScreenAnimatedIcon` to `@drawable/splashscreen_logo` (`withAndroidSplashStyles.js:43-46`) but only writes that drawable when an image is configured (`withAndroidSplashImages.js:60` doc comment "If path isn't provided then no new image is placed", and `:89-97` writes per-density PNGs only `if (image)`; `withAndroidSplashDrawables.js:34` adds the bitmap layer only when `image` is set), so omitting it would leave the theme pointing at a drawable that doesn't exist. Status: **source-verified** in `expo-splash-screen` 57.0.9, **not built**; confirm with `npx expo prebuild --platform android` plus a release build. Recommendation: do **not** use `enableFullScreenImage_legacy` on iOS, because it is slated for removal and would make iOS and Android differ; the native phase is usually brief. |
| Seamless handoff | Call `preventAutoHideAsync()` at module scope. The root layout first renders a full-screen `View` with the **same background colour**, then the GIF on top (`contentFit="cover"`, `clouds.jpg` as `placeholder` so there is no blank frame while the GIF decodes). Call `SplashScreen.hide()` only after that first frame is laid out (e.g. `onLayout` / `onLoad`), so native colour → JS colour → clouds has no flash or colour jump. |
| Ready → app | Fade the JS overlay out with Reanimated once DB (`onInit`), MMKV settings, the first-run keychain cleanup and `hasApiKey` (§2.8) are done. No fixed minimum duration (architect default). |
| Verify on a release build | The v57 splash docs say Expo Go and development builds do not fully replicate the standalone splash; check on a release/preview build on both platforms, including an Android 12+ device. |

---

## 4. Architecture today (old app)

### 4.1 Navigation

`Stack (root) → Drawer (custom content) → { (tabs): Tabs[index, dashboard], diary, profile, settings, chat }`

| Detail | Source |
|---|---|
| `Drawer` from `expo-router/drawer`, but `DrawerContentScrollView` from `@react-navigation/drawer`. | `app/(drawer)/_layout.tsx:1,4` |
| Every screen imports `DrawerActions` and `useNavigation` from `@react-navigation/native`. | `index.tsx:1-2`, `dashboard.tsx:1-2`, `diary.tsx:1-2`, `profile.tsx:2-3`, `settings.tsx:2-3`, `chat.tsx:1` |
| `CustomDrawer(props: any)` and `router.navigate(item.href as any)`. | `app/(drawer)/_layout.tsx:72,97` |
| `HapticTab` uses `@react-navigation/bottom-tabs` and `@react-navigation/elements`. | `components/haptic-tab.tsx:1-2` |

### 4.2 State

| State | Mechanism | Source |
|---|---|---|
| Theme | React Context with a synchronous SQLite read in the initializer. Exposes `theme`, `themeName`, `setThemeName`, `paperTheme` (built on `MD3LightTheme`) and `backgroundImage`. | `context/ThemeContext.tsx:6-66` |
| Screen data | Local `useState`, loaded via sync DB calls in `useFocusEffect` (Dashboard, Profile), `useMemo` (Diary), or `useState` initializers (Settings, Chat). | see §1 |
| Settings | Read straight from SQLite in each component. No shared store. | `settings.tsx:81-86,179-180`, `index.tsx:162-163` |
| Chat history | `useRef`. | `chat.tsx:145` |

### 4.3 Styling

- Palettes are light-only (`constants/theme.ts:13-35`). The Lavender, Sage and Water primaries are `#C47ED0`, `#8DC48D` and `#4AA8C8`.
- Each theme has a full-screen background image at 35% opacity. Sizes: `lavender.png` 370,958 bytes; `sage.jpeg` 3,508 bytes; `water.png` 1,012,324 bytes (`constants/theme.ts:37-41`, used e.g. `index.tsx:211`).
- Styles come from `makeStyles(theme)` + `StyleSheet.create` inside `useMemo` on each screen.

### 4.4 Key dependencies (`package.json:47-90`)

| Package | Version | Used for |
|---|---|---|
| expo | ~54.0.34 | |
| expo-router | ~6.0.23 | routing |
| react-native / react | 0.81.5 / 19.1.0 | |
| @react-navigation/native, drawer, bottom-tabs, elements | ^7.1.8, ^7.12.2, ^7.4.0, ^2.6.3 | DrawerActions, DrawerContentScrollView, HapticTab |
| react-native-paper | ^5.15.3 | UI |
| expo-sqlite | ~16.0.10 | storage |
| expo-notifications | ~0.32.17 | reminder |
| expo-image-picker | ~17.0.11 | profile photo |
| @react-native-community/datetimepicker | 8.4.4 | reminder time |
| expo-image | ~3.0.11 | splash GIF only |
| expo-haptics | ~15.0.8 | HapticTab (in use, not just template) |
| expo-symbols, expo-web-browser | ~1.0.8, ~15.0.11 | template only (`components/ui/icon-symbol*.tsx`, `components/external-link.tsx`) |
| @expo/vector-icons | ^15.0.3 | Ionicons, MaterialCommunityIcons |
| react-native-web / react-dom | ~0.21.0 / 19.1.0 | web (unused per D10) |
| jest / jest-expo | ^29.7.0 / **^56.0.5** | tests (jest-expo does not match SDK 54) |
| react-test-renderer + test-renderer | ^19.1.0 / ^1.2.0 | plus a `moduleNameMapper` hack (`package.json:19`) |
| typescript | ~5.9.2 | |

- Config: `newArchEnabled: true` (`app.json:10`), `android.package: com.teddeej.moodbuddy` (`app.json:15`), **no** `ios.bundleIdentifier` (`app.json:11-13`).
- EAS: `eas.json` exists, with profiles `development`, `preview` and `production`, and `appVersionSource: remote` (`eas.json:1-24`). EAS `projectId` and `owner: teddeej` are set (`app.json:65-71`).

---

## 5. Problems

### 5.1 Bugs and likely bugs

| # | Problem | Evidence | Confidence |
|---|---|---|---|
| B1 | The second `initialPrompt` is ignored and old messages remain. Drawer screens stay mounted, the `initialized` ref is already true, and the effect has `[]` dependencies. | `chat.tsx:143,164-171` | Likely; not reproduced |
| B2 | A key added in Settings is not seen by an already-mounted Chat, because the key is read once in a `useState` initializer. | `chat.tsx:140` | Likely |
| B3 | A failed request leaves the history ending on a `user` turn. The next send then has two consecutive user messages. The API merges these, so it is not fatal, but the failed text is resent. | `chat.tsx:173-195,202` | Confirmed in code |
| B4 | The Diary list doesn't refresh on focus. It is a `useMemo` keyed only on `range`, so new check-ins don't show until the range changes. `todayDate` is also frozen at mount, so the default "today" goes stale after midnight. | `diary.tsx:388-398` | Likely |
| B5 | The Settings AI switch goes stale after the Home dialog enables AI, because it is initialised once. | `settings.tsx:179`, `index.tsx:178` | Likely |
| B6 | Settings reschedules or cancels the reminder on **every mount**, with no permission check. | `settings.tsx:89-96` | Confirmed |
| B7 | The reminder fires even after a check-in. | `lib/notifications.ts:40-44` | Confirmed |
| B8 | The trigger has no `channelId`. The `mood-checkin` channel is created but probably unused. Which channel Android actually uses is **unverified**. | `lib/notifications.ts:8-13,40-44` | Probable |
| B9 | A cold-start notification tap may be missed: the listener is registered in an effect and there is no `getLastNotificationResponse` call. | `app/_layout.tsx:46-51` | Uncertain |
| B10 | DB init runs in the root layout `useEffect`, after child effects; only the `settings` table is created at import. A cold-start deep link to `/dashboard` or `/diary` could query tables that don't exist yet on first install. | `app/_layout.tsx:38-44`, `lib/database.ts:6` | Not reproduced |
| B11 | The profile photo URI is the picker's result URI, which is probably in a purgeable cache. | `profile.tsx:175` | Unverified |
| B12 | ZenQuotes errors are swallowed, so the card shows "Loading…" forever. The quote is refetched on every mount. | `profile.tsx:125-132,259` | Confirmed |
| B13 | Message IDs are `${Date.now()}`, so a user and assistant message created in the same millisecond can collide on key. | `chat.tsx:180,186,203` | Low |
| B14 | Diary future dates are selectable (no future-date check in the day-press handler). | `diary.tsx:85-110` | Confirmed |
| B15 | The 90-day prompt purge runs only on insert, so with no new check-ins old prompts linger (§3.7). | `lib/database.ts:138-146` | Confirmed |
| B16 | Raw API error text is shown to the user. | `chat.tsx:188` | Confirmed |

### 5.2 Security and privacy

| Problem | Evidence |
|---|---|
| The Anthropic key is stored as plain text in SQLite and saved on every keystroke. | `settings.tsx:188-191` |
| Deep link `moodbuddy://chat?initialPrompt=…` silently sends arbitrary attacker-controlled text using the user's key and money, with no confirmation. | `chat.tsx:135,163-171`; `app.json:8` |
| Unused `android.permission.RECORD_AUDIO`. | `app.json:24-26` |
| README privacy claim is wrong (ZenQuotes). | `README.md:92` |

### 5.3 Duplicated logic

| Duplicate | Locations |
|---|---|
| Local date formatting | `lib/database.ts:165-166` vs `lib/dashboard-utils.ts:22-24` |
| Day labels | `dashboard-utils.ts:11` (`DAY_LABELS`) vs `diary.tsx:35` (`DOW_LABELS`) |
| Month names | `dashboard-utils.ts:12` vs `diary.tsx:30-33` |
| Appbar + `ImageBackground` + white card styles copied on 6 screens | `index.tsx:20-27,211-219`; `dashboard.tsx:280-300,346-354`; `diary.tsx:312-318,338-349,407-420`; `profile.tsx:28-29,53-63,183-199`; `settings.tsx:231-252,358-366`; `chat.tsx:30-32,101-111,209-218,237-246` |
| Same-day helpers | `diary.tsx:13-19` vs string compare in `dashboard-utils.ts` |

### 5.4 Tech debt and structure

| Problem | Evidence |
|---|---|
| Large screen files: Settings 378 lines, Diary 447, Dashboard 394, Home 320, Chat 311. | `wc -l` |
| Sync DB calls run on the JS thread at import and in render paths. `getAllEntryDates` reads every row on every Dashboard focus. | `lib/database.ts:3-6,159-170`; `dashboard.tsx:312-319` |
| Untyped drawer props (`props: any`) and `href as any`. | `app/(drawer)/_layout.tsx:72,97` |
| Mixed navigation imports (`@react-navigation/*` alongside expo-router). | §4.1 |
| Template leftovers, not imported by any app code: `components/hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx`, `ui/collapsible.tsx`, `ui/icon-symbol*.tsx`, `hooks/use-theme-color.ts`, `hooks/use-color-scheme*.ts`, `Colors`/`Fonts` in `constants/theme.ts:43-81`, `scripts/reset-project.js`. | grep found no imports from `app/`, `context/` or `lib/` |
| `userInterfaceStyle: automatic` and a dark splash, but no dark palettes. | `app.json:9,41-43`; `constants/theme.ts:13-35` |
| Slug typo `mood-budy`. `newArchEnabled` is probably redundant (**unverified** for v57 whether the key is still accepted). 1.4 MB `app_icon.png` (1,425,680 bytes). | `app.json:4,10,7` |
| Both `package-lock.json` and `yarn.lock` are committed. A stale `coverage/` (39 files, last commit Jun 16 2026) is committed. | `git ls-files` |
| Heavy assets: `clouds_spinner.gif` 979 KB, `water.png` 1.0 MB, `lavender.png` 371 KB. | `assets/images` |
| Hard-coded `en-US` dates and 12-hour times. | `diary.tsx:376-381`; `settings.tsx:67-73` |

### 5.5 Tests

Verified by running `TZ=UTC jest --coverage=false` against the old repo on 2026-10-06:

- 8 suites. 5 pass (65 tests). **3 fail to run**:
  - `__tests__/components/emoji-picker.test.tsx` fails with `ExpoSQLite.default.NativeDatabase is not a constructor`, because importing ThemeContext opens the DB at import.
  - `__tests__/app/profile.test.tsx` and `__tests__/app/screens.test.tsx` fail with `Cannot read properties of undefined (reading 'colors')`, because the Paper mock has no `MD3LightTheme` (`ThemeContext.tsx:18`).
- `screens.test.tsx:112` also expects the stale placeholder "Settings coming soon.". The Paper mock (`screens.test.tsx:49-66`) has no `Dialog`, `Portal`, `Switch` or `IconButton`.
- No tests exist for `lib/claude.ts`, `lib/notifications.ts`, Chat, Diary or `ThemeContext`.

### 5.6 Accessibility

| Problem | Evidence |
|---|---|
| Emoji tiles have no `accessibilityRole`, label or selected state. Labels are 10pt with `adjustsFontSizeToFit`. | `components/emoji-picker.tsx:45-50,67-84` |
| Calendar cells read only the number ("15"). Month arrows are unlabeled text glyphs. | `diary.tsx:118-126,159-195` |
| The drawer close button and Appbar icon actions have no labels. | `app/(drawer)/_layout.tsx:86-88`; e.g. `profile.tsx:191-198` |
| Charts and word clouds have no text alternative. The range selector has no selected state. | `dashboard.tsx:78-88,132-175,216-228` |
| Chat has no live region for new replies or "Thinking…". | `chat.tsx:259-288` |
| **Contrast (computed WCAG ratios):** white on `#C47ED0` is 2.90, on `#8DC48D` 2.02, on `#4AA8C8` 2.72, on `#E07B7B` 2.88, on `#7BA8D4` 2.50. Theme secondaries on white, used for diary timestamps and empty text: Sage `#D4DF8A` 1.43, Water `#5CD4E8` 1.74, Lavender `#A882CB` 3.12 (`constants/theme.ts:18,25,32`). All are below 4.5:1 (body text) and most are below 3:1 (UI elements). | `constants/theme.ts:13-35`; `diary.tsx:350-355,361-366` |
| Low-opacity secondary text (opacity 0.35–0.6) is used in many places. | e.g. `profile.tsx:85-89`, `dashboard.tsx:122-129` |

---

## 6. Keep / change / drop

### 6.1 Per-area recommendations

| Area | Recommendation | Detail / v57 check |
|---|---|---|
| Routing location | **Change** | Routes go in `v2:src/app/` (AGENTS.md; D38, a deliberate deviation from the architect default of root `app/`) and stay thin: import and render a screen from `src/ui/screens/`, plus route options only (D23). |
| Drawer (D7) | **Keep, change imports** | `import { Drawer } from 'expo-router/drawer'`: docs say `@react-navigation/drawer` is *not* required for SDK 56+. `DrawerContentScrollView`, `DrawerToggleButton` and the type `DrawerContentComponentProps` are exported from `expo-router/drawer` (confirmed in `v2:node_modules/expo-router/build/layouts/Drawer.d.ts`; docs don't cover them, so **docs-unverified**). `DrawerActions` is reachable via `expo-router/react-navigation` (re-exports `build/react-navigation/routers`; installed types only, **docs-unverified**). Prefer `DrawerToggleButton` or typed `useNavigation()` from `expo-router`. Drop `props: any`. Drawer menu items: **Diary, Profile, Settings only** (D17, D35); no Home, Dashboard or "Check-in" item. |
| Tabs inside drawer | **Keep** | Use **JS** `Tabs` imported from **`expo-router/js-tabs`**: in the installed expo-router 57, `Tabs` from `expo-router` is marked `@deprecated Use import { Tabs } from 'expo-router/js-tabs' instead` (`v2:node_modules/expo-router/build/exports.d.ts`); the v57 tabs docs page still imports from `expo-router`, so the deprecation is **installed-types only**. Not `NativeTabs` (see D35 below). Keep iOS-only tab haptics (D17), re-implemented with `expo-haptics` and without `@react-navigation/elements`. **`HapticTabButton` goes in the Tabs `screenOptions.tabBarButton` only, never in a screen's own `options`:** the installed `TabsClient.js:17-18` throws "Cannot use `href` and `tabBarButton` together." when a screen's options set both, and the hidden tabs set `href: null`. Per-screen `href` then overrides the shared button with one that renders nothing for hidden tabs (`TabsClient.js:26-29`). **Hidden tabs must use the object form `options={{ href: null }}`:** `TabsClient.js:15` only applies `href` when `typeof screen.options !== 'function'`, so a function-form `options` silently ignores it. Make the tab bar background a theme token, not `#FFFFFF`. **Keyboard:** because the tab bar now stays visible on Home, Profile and Settings (all have text inputs: notes, bio, API key), set `tabBarHideOnKeyboard: Platform.OS === 'android'` in `screenOptions` (default is `false`, `build/react-navigation/bottom-tabs/views/BottomTabBar.js:121`) so the bar doesn't ride up above the Android keyboard; on iOS the keyboard covers it. Check on device together with the screens' keyboard avoidance. |
| Duplicate Home/Dashboard in drawer and tabs | **Drop from drawer** (D17) | Home and Dashboard are reachable from the tab bar only, which stays visible everywhere except Chat (D35). |
| Navigation (D35) | **Change** | **Structure:** Root Stack → `(drawer)` (Drawer) → `(tabs)` (JS Tabs) → `index` (Home), `dashboard`, and `diary`, `profile`, `settings` declared as `<Tabs.Screen name="…" options={{ href: null }} />` (object form required: `TabsClient.js:15` ignores `href` when `options` is a function). **Verified:** `href: null` hides a tab while keeping its route navigable (v57 "JavaScript tabs" docs; installed `TabsClient.js` sets `tabBarItemStyle: { display: 'none' }` and renders no button when `href == null`). `NativeTabs` is **not suitable**: its `hidden` option "means it cannot be navigated to in any way" (installed `native-tabs/types.d.ts`). The Drawer wrapping the Tabs matches the old app's working structure (`app/(drawer)/(tabs)/`); the v57 docs have no Drawer-around-Tabs example, so the nesting is **docs-unverified** but supported by React Navigation nesting. **URLs** stay `/`, `/dashboard`, `/diary`, `/profile`, `/settings` (groups add no segment). **Opening the drawer:** hamburger in each screen's Appbar dispatches `DrawerActions.openDrawer()` (or uses `DrawerToggleButton`); from inside Tabs the action bubbles up to the parent Drawer (standard React Navigation behaviour, **device-unverified**); edge swipe also works. **Drawer items** call `router.navigate('/diary')` etc. and close the drawer. **Active state:** the Drawer's own focused route is always `(tabs)`, so its built-in highlight is useless; the custom drawer content highlights by `usePathname()` and sets `accessibilityState={{ selected }}`. On Home/Dashboard no drawer item is highlighted (correct: they aren't in the menu). On a hidden tab, the tab bar shows **no** selected tab (the focused tab has no button); the screen's Appbar title says where the user is. **Back:** JS Tabs default `backBehavior` is `firstRoute` (verified in the bundled copy: `v2:node_modules/expo-router/build/react-navigation/routers/TabRouter.js:96`; `createBottomTabNavigator.js:8-12` passes `backBehavior` through undefined when not set), so Android back from Diary/Profile/Settings goes to Home, then exits. Don't set `backBehavior`. **Mounting:** hidden tabs mount lazily and stay mounted, like the old drawer screens, so data refresh must use focus effects / Query invalidation (B4). **Haptics** only fire for the two visible tab buttons. **A11y:** hidden tabs render no button, so screen readers see only Home and Dashboard in the tab bar; each screen announces its title; the drawer is reachable by the labelled hamburger. |
| Chat route | **Change** | Recommended: a **root Stack screen** (`src/app/chat.tsx`) pushed over the drawer, with a back button and no tab bar or drawer swipe, instead of a hidden drawer screen; leaving it pops back to where the user was. The root layout keeps `unstable_settings.anchor = '(drawer)'` (as old `app/_layout.tsx:16-18`) so a cold-start `moodbuddy2://chat` link has the drawer beneath it; with nothing pending, Chat shows the empty state in §3.10. `router.navigate('/settings')` from Chat's **Open Settings** and a notification tap to `/` while Chat is open must close Chat and show the target screen; whether `navigate` pops the root Stack or `router.dismissTo` is needed is **unverified**, check on device. Keep it reachable from Home only. **Do not** accept `initialPrompt` from URLs. Pass the context via the Redux `chat` slice handoff (§3.10) and validate any params (`useLocalSearchParams` from `expo-router`). Clear the conversation when a new handoff arrives (D24, fixes B1). Gate on toggle and key (D29, §3.10). Derive key presence from the Redux `hasApiKey` flag, updated on save/remove (fixes B2). |
| Paper + 3 themes (D6) | **Keep** | Light only: set `userInterfaceStyle: light` and drop the dark splash. Re-tune the primaries or use dark text on primaries to reach ≥ 4.5:1 (§5.6). Recompress or replace the background images (§5.4). |
| Theme context | **Keep, change** | Theme name lives in the persisted Redux `settings` slice (MMKV); a Context/selector supplies the Paper MD3 theme from `src/themes/`. Read before the JS splash fades (§3.11). No sync DB at import. |
| SQLite | **Keep, change** | Use `expo-sqlite` with `SQLiteProvider` and `onInit` running `PRAGMA foreign_keys = ON` (required on every connection for the `entry_id` cascade, §2.7) and then `PRAGMA user_version` migrations, so the DB is ready before any screen renders (fixes B10). Add indexes. Add `tz_offset_min` and the NOT NULL `entry_id` FK (D18, D20). Old schema is reference only (D1). |
| Settings store | **Change** (D23) | `react-native-mmkv`, keys in §2.8, behind a small wrapper in `src/services/`. Settings that several screens read are mirrored in a persisted Redux `settings` slice (fixes B5). |
| API key (D2, D15) | **Change** | Store it with `expo-secure-store` `setItemAsync` on an explicit Save (not per keystroke). After save, show it masked with **Replace** and **Remove** actions. **Remove** aborts any in-flight chat request (§3.10), calls `deleteItemAsync`, and sets `hasApiKey` to false. No network validation on Save (D15). First-run orphan cleanup: §2.8. Note from the docs: on iOS, keychain items **persist across uninstall/reinstall with the same bundle ID**, so "delete all my data" must call `deleteItemAsync`. On Android, data is not preserved after uninstall. |
| Anthropic client | **Change** | Through the shared Axios instance (D23, N1), HTTPS only, `x-api-key` redacted in every interceptor, error and log. `claude-sonnet-5-5` (verified), `anthropic-version: 2023-06-01` (verified current). Add a timeout. Abort the in-flight request on toggle-off (D29), Remove key, delete-all and a new check-in handoff, but **not** on leaving Chat (§3.10 "Abort in-flight requests"). Handle `stop_reason` (`refusal`, `max_tokens`). Map errors per §3.10 (B16). Roll back a failed user turn or mark it (B3). Trim history. Revisit `max_tokens: 512` under adaptive thinking (§2.6). Called from a TanStack Query mutation, never from a component directly; the service owns the `AbortController` and dispatches the reply into the `chat` slice itself (not via per-call `mutate()` callbacks), per §3.10. Fix the README mismatch. |
| Chat history persistence | **Drop** (D2) | Memory only (Redux `chat` slice, not persisted). Cleared only by the next check-in handoff, delete-all, turning the AI toggle off (D44/Q36), or app restart; kept when leaving the screen (D24). |
| Diary prompts (D3) | **Keep** | Same text, with the D4 thresholds. Purge older than 90 days on insert, app start **and** foreground (§3.7). Refresh the list on focus (B4). Recompute "today" on focus. Disable future dates **and** dates before the 90-day window (D16, §3.3). Use locale-aware formatting. List with FlashList v2 (D23). |
| Check-in (Home) | **Keep, change** | Apply D4 with the D39 values and the D48 display order (mood 1 → 5, stress and anxiety 5 → 1, so the best state is on the right in every row; end labels under each row; notes under the two leftmost stress/anxiety tiles; nothing pre-selected). Store `tz_offset_min` (D20). Allow multiple entries per day (D5). Fix the a11y of tiles. After a check-in, cancel today's reminder (§3.6). AI dialogs per §3.10 (D19). |
| Delete single entry (D5, D18) | **Add** | Swipe-to-delete with a confirmation dialog on Diary cards, plus an accessible non-swipe path (§3.8). Deleting the entry cascades to its prompt. Reschedule today's reminder if no entries remain today (not during timezone grace, D47). Entries older than 90 days: delete-all only (D36). |
| Export (D5, D14) | **Add** | CSV with a date-range filter, no photo, temp file deleted after sharing. Full rules in §3.9. |
| Delete all my data (D5, D30) | **Add** | Clears user content only: `mood_entries`, `diary_prompts`, `profile`, the copied profile photo, the API key (`deleteItemAsync`, `hasApiKey` → false), the in-memory chat (after aborting any in-flight request) and any export temp files. **Keeps** theme, reminder settings, `ai_integration_enabled` and `ai_chat_prompt_shown` (D43), quote cache, timezone keys and `install_initialized` (§2.8). Then cancels and reschedules the reminder window; today is included only if the reminder time hasn't passed (§3.6). Confirm with a destructive dialog. |
| Dashboard | **Keep, change** | Same calculations (§3.5) with D4 captions, write-time local dates (D20) and per-day means for Month/Year (D31). Do date math off the render path (memoize). Replace "read every row" with a `SELECT DISTINCT` on local date or a bounded query. Add text alternatives. Unicode word cloud (D22). |
| Profile | **Keep, change** | Copy the photo to the document directory (B11). Use `expo-image` for the avatar. |
| ZenQuotes (D8, D21) | **Keep, change** | TanStack Query via Axios, fetched at most once per local day. On failure show the cached last good quote; with no cache, a visible error and Retry (B12). Keep the "Powered by ZenQuotes.io" attribution. Disclose the call in the privacy text and fix `README.md:92`. |
| Reminder (D9, D28, D20) | **Change** | Rolling one-shot `DATE` triggers, N = 14, with `channelId` (§3.6 option B) and the 24-hour timezone grace rule. Create the channel at startup on Android. Use only `shouldShowBanner` and `shouldShowList` (drop the deprecated `shouldShowAlert`). Drop the `MOOD_LOG` category and "Log Mood" action (§3.6). Check-in cancellation by trigger instant, not by ID date (§3.6). Handle cold start via `getLastNotificationResponse()` / `useLastNotificationResponse()` and route to `/`. No reschedule on Settings mount (B6). |
| Time picker | **Change** | Replace `@react-native-community/datetimepicker` with `@expo/ui`'s compatible picker (needs a development build, D26). Path conflict: the v57 docs page says the drop-in lives at `@expo/ui/drop-in-replacements`, but the installed package exports `@expo/ui/community/datetime-picker` (supports `mode: 'time'`, `presentation: 'inline' \| 'dialog'`, `onValueChange`/`onDismiss`; the old `onChange` is deprecated). **Confirm the import path before coding** (implementation check; Verification log). |
| Image picker | **Keep** | `expo-image-picker` (install via `npx expo install`). |
| `@react-navigation/*` deps | **Drop** | Bundled in expo-router 57. |
| Web (`react-native-web`, `react-dom`, `web` config, `*.web.tsx`) | **Drop** (D10) | |
| Tablet | **Drop** (D11) | `ios.supportsTablet: false`. |
| Template leftovers (§5.4) and v2 template files (`v2:src/app/explore.tsx`; in `v2:src/components/`: `animated-icon.tsx`, `animated-icon.web.tsx`, `animated-icon.module.css`, `web-badge.tsx`, `hint-row.tsx`, `app-tabs.tsx`, `app-tabs.web.tsx`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx`, `ui/collapsible.tsx`; `v2:src/global.css`; `v2:src/hooks/use-theme.ts`, `use-color-scheme.ts`, `use-color-scheme.web.ts`; `v2:src/constants/theme.ts` (template light/dark palette)) | **Drop** | |
| `clouds_spinner.gif` overlay | **Keep, fix** (D27) | Keep the clouds; make the launch-to-ready sequence full-screen per §3.11. Re-encode the GIF if it stays heavy. |
| `RECORD_AUDIO` permission | **Drop** | `app.json:24-26` |
| `newArchEnabled` | **Drop** | Probably redundant (**unverified** for v57 whether the key is still accepted). |
| Lockfiles / coverage | **Change** | yarn only. Add `coverage/` to `.gitignore`. |
| Tests | **Change** | jest-expo matched to SDK 57 (`npx expo install jest-expo`). Tests in `src/tests/__tests__/`, mocks in `src/tests/__mocks__/` with Jest `roots` (and `moduleNameMapper` if needed) so package mocks are found (D23). Mock `expo-sqlite`, `expo-secure-store`, MMKV and Paper properly (or render with the real Paper). Coverage (D12, D32): lines/statements/functions 65, branches 50, notifications and chat excluded. Run tests in a non-UTC TZ too, and add offset-at-write cases (D20). |
| Redux Toolkit (D23) | **Add** | Two slices only. `settings`: theme, AI toggle, prompted flag and reminder settings (persisted to MMKV), plus `hasApiKey` (**not persisted**: excluded from the MMKV write, derived from SecureStore at startup and updated on Save/Remove/delete-all); used by the root layout (theme, reminders), Home, Chat and Settings; Redux because it is cross-screen and persisted. `chat` (memory): pending handoff + messages; used by Home and Chat; Redux because it must survive navigation (D24). Everything else stays local (§6.3). |
| TanStack Query + Axios (D23) | **Add** | One Axios instance in `src/services/` (timeouts, HTTPS, redaction); typed request functions for Anthropic and ZenQuotes; Query hooks wrap them. SQLite reads also go through Query keys so delete/insert invalidation refreshes Diary, Dashboard and streak (fixes B4). |
| FlashList v2 (D23) | **Add** | Diary list and Chat messages. No `estimatedItemSize`. Memoized row components. |
| Env config (D23) | **Add** | `src/constants/env.ts` reads `EXPO_PUBLIC_ANTHROPIC_API_URL` and `EXPO_PUBLIC_ZENQUOTES_URL` statically and validates them at startup; `.env.example` committed; `.env*.local` ignored. No secrets in env (the Anthropic key is user-supplied). |
| Lint / typecheck | **Add** | `npx expo lint` and `npx tsc --noEmit` before any task is done (AGENTS.md). |
| Native dirs | **Keep CNG** | No `ios/` or `android/` edits. Everything goes through `app.json` and config plugins (AGENTS.md). Old `.gitignore` already ignores them. |

### 6.2 v2 layout (per D23; routes in `src/app/` per D38)

```
src/app/_layout.tsx                 Root Stack [(drawer), chat] + providers + JS splash + notification observer (thin)
src/app/chat.tsx                    → src/ui/screens/ChatScreen (root Stack screen, D35)
src/app/(drawer)/_layout.tsx        expo-router/drawer; custom content: Diary, Profile, Settings only (D35)
src/app/(drawer)/(tabs)/_layout.tsx JS Tabs (expo-router/js-tabs); HapticTabButton set ONLY in
                                    screenOptions.tabBarButton (never per screen: href + tabBarButton
                                    on one screen throws, TabsClient.js:17-18); tabBarHideOnKeyboard
                                    on Android; diary/profile/settings declared with object-form
                                    options={{ href: null }} (function-form options ignore href,
                                    TabsClient.js:15) (D35)
src/app/(drawer)/(tabs)/index.tsx   → src/ui/screens/HomeScreen
src/app/(drawer)/(tabs)/dashboard.tsx → src/ui/screens/DashboardScreen
src/app/(drawer)/(tabs)/{diary,profile,settings}.tsx → matching screens (hidden tabs)
src/constants/                      env.ts, scales (D4), stop words
src/hooks/                          app-wide hooks (app-state/foreground, timezone watch)
src/services/                       axios instance, anthropic, zenquotes, db/ (schema, migrations,
                                    queries), mmkv + secure-key wrappers, export, reminders
src/state/                          Redux store, settings + chat slices
src/themes/                         Paper MD3 Lavender / Sage / Water (light only)
src/types/                          shared types
src/utils/                          prompt builder, dashboard math, dates, CSV, tokenizer
src/ui/components/                  e.g. DiaryCard/, BarChart/, WordCloud/, RangeCalendar/
src/ui/screens/                     HomeScreen/, DashboardScreen/, DiaryScreen/, ...
src/ui/widgets/                     e.g. EmojiTile/, HapticTabButton/
src/tests/__tests__/, src/tests/__mocks__/
modules/no-backup/                  local Expo module (iOS only): excludes Documents/ and Application
                                    Support/ from backup at launch (D49); autolinked from ./modules
```

Each component, screen and widget folder holds `Name.tsx`, `Name.props.ts` (props + `StyleSheet.create` from theme values) and `useName.ts` when it has logic.

### 6.3 Convention alignment (D23)

Status per architect guideline: **Adopted**, **Adapted** (adopted with a stated change), **N/A** (nothing in this app needs it), or **Conflict**.

| Guideline | Status | Notes / interaction with AGENTS.md and other decisions |
|---|---|---|
| Expo SDK + Expo Router, Hermes, TS strict, New Architecture | Adopted | Matches v2 baseline and AGENTS.md. |
| Route folder `app/` at repo root | **Adapted** (D38) | Owner chose **`src/app/`** (AGENTS.md; v2 is already wired that way, `@/*` alias). This deviates from the architect default; record it in the v2 `CLAUDE.md` Conventions. Routes stay thin. |
| Folder layout (`src/constants, hooks, services, state, themes, types, utils, ui/{components,screens,widgets}, tests`) and one folder per component | Adopted | §6.2. `managers/` is N/A (no analytics). |
| React Native Paper MD3, themes in `src/themes/` | Adopted | Same as D6. Light only. |
| `StyleSheet.create` in `Name.props.ts`, no inline styles | Adopted | Theme-dependent styles via a `makeStyles(theme)` exported from `Name.props.ts`. |
| TanStack Query for server state | Adopted | ZenQuotes query, Anthropic mutation. Extended to local SQLite reads for cache invalidation (architect choice; local data is not server data, so the "never in Redux" rule still holds). |
| Axios single instance in `src/services/` | Adapted | One shared instance (timeouts, HTTPS check, redaction), absolute URLs per service because there are two hosts. Replaces raw `fetch`; the Anthropic SDK is not used (N1). |
| Redux Toolkit, used sparingly per the State Placement Rule | Adopted | Two slices only (§6.1). The app is small; anything single-screen stays in local state or the screen hook. |
| `react-native-mmkv` for non-sensitive persistence | Adopted | Owner's explicit Q11 choice overrides AGENTS.md's soft "prefer Expo modules" for this package (the same applies to Redux Toolkit, TanStack Query, Axios and FlashList; §7.3); replaces the `expo-sqlite/kv-store` option. Consequence: dev build only (no Expo Go). SQLite (an Expo module) still holds relational data (entries, prompts, profile) because of range queries and the FK cascade; MMKV is not a substitute there. No conflict left open. |
| `expo-secure-store` for secrets | Adopted | Same as D2. |
| `.env` + `src/constants/env.ts`, no secrets in `EXPO_PUBLIC_` | Adopted | Only public URLs. |
| Reanimated for animations, worklets for heavy work | Adopted / N/A | Reanimated for swipe and splash fade. No heavy JS work identified; CSV and dashboard math are small (revisit if profiling shows otherwise). |
| `react-native-gesture-handler` | Adopted | Swipe-to-delete (D18). |
| FlashList v2 instead of FlatList | Adopted | Diary list, Chat messages. |
| `expo-image` instead of RN `<Image>` | Adopted | Avatar, splash image and GIF. No remote images (quotes are text), so blurhash is N/A. |
| Jest, tests under `src/tests/` with `roots` | Adopted | D32 thresholds. |
| No manual `ios/`/`android/` edits; config plugins only | Adopted | Same as AGENTS.md (CNG). |
| No legacy-only libraries; check New Arch support | Adopted | Old datetimepicker is dropped anyway. Installed 2026-10-07 (npm/installed package.json): react-native-mmkv 4.3.2 and react-native-nitro-modules 0.37.1 (Nitro modules, New Architecture only; peers `react-native: *`), @reduxjs/toolkit 2.13.0, react-redux 9.3.0, @tanstack/react-query 5.104.1 (pure JS). Axios and FlashList (SDK-pinned 2.0.2) are deferred. **Still open:** a native build of MMKV/Nitro on RN 0.86.3 (first development build). AGENTS.md's `npx expo install` is still the install command. |
| Security: HTTPS only, no secrets in logs, validate params, `npm audit` | Adopted | Repo uses yarn, so run the yarn equivalent of audit; fix moderate+ before release. No WebView (N/A). |
| `CLAUDE.md` Conventions section | Adopted, deferred | v2 has no `CLAUDE.md`. Create it at implementation start summarizing this table and AGENTS.md; this spec does not create files. It **must** record at least: (1) routes live in **`src/app/`** (D38), a deliberate deviation from the architect default of root `app/`, so the reviewer doesn't flag it; (2) **import `Tabs` from `expo-router/js-tabs`**, not from `expo-router` (deprecated in the installed types) and never `NativeTabs`; no direct `@react-navigation/*` imports (use `expo-router/drawer`, `expo-router/react-navigation`); (3) `HapticTabButton` only in Tabs `screenOptions` (§6.1); (4) stress/anxiety display order 5 → 1 is a rendering rule, scale constants stay in value order (D48). |

---

## 7. Open questions

### 7.1 Open follow-ups (owner)

Q1–Q37 are all answered (§7.2). The Rev 6 open owner decision (Face ID usage string) is **resolved as D50** (`faceIDPermission: false`); the owner's no-backup decision is **D49**. There are no open owner questions. Reviewer suggestions the owner has **not** decided (left open, not applied): a Node minimum-version change, tightening the timestamp `CHECK`, and test clean-ups. What remains are implementation-time checks, each listed in the Verification log as **unverified**, **device-unverified** or **source-verified (not built)**: none of them changes a decision. The only one that may come back to the owner is an asset request: if the 325×529 clouds GIF looks soft at full screen on device (§3.11 "Asset quality"), a higher-resolution version of the same animation is needed.

### 7.2 Answered (traceability)

| Q | Owner answer (summary) | Folded into |
|---|---|---|
| Q1 | New ID | D13 (strings: D33) |
| Q2 | CSV, no photo, range filter, delete from cache after sharing | D14, §3.9 (layout: D34) |
| Q3 | Validate on first chat | D15, §3.10 |
| Q4 | Disable older dates; delete entry deletes prompt; export includes expiring prompts | D16, §3.3, §3.9 |
| Q5 | Remove Home and Dashboard from drawer; keep tab haptics | D17 (return path: D35) |
| Q6 | Delete prompt with entry; swipe-to-delete with confirmation modal on Diary; proposed schema accepted | D18, §2.7, §3.8 (old entries: D36) |
| Q7 | Remove the prompt until a key exists | D19, §3.10 |
| Q8 | Store offset at write; reschedule rolling reminders 24h after a TZ change | D20, §2.7, §3.5, §3.6 (reading: D37) |
| Q9 | Cache a quote for fallback; disclose in privacy text | D21 |
| Q10 | Switch to Unicode | D22, §3.5 |
| Q11 | Align with the architect agent's built-in guidelines | D23, §6.2, §6.3 (route folder: D38) |
| Q12 | "Good to know" | N1 (informational, no decision) |
| Q13 | Clear on each new check-in handoff | D24, §3.10 |
| Q14 | Stress and anxiety rows on the same side | D25 (meaning settled by D48; values D39) |
| Q15 | "It does" | D26 (closed: D40) |
| Q16 | Keep the clouds; fix the non-fullscreen splash | D27, §3.11 (look: D41) |
| Q17 | N = 14 is fine | D28, §3.6 (copy: D42) |
| Q18 | Shouldn't work with the toggle off | D29, §3.10 |
| Q19 | User context only | D30, §2.8 (AI flags: D43) |
| Q20 | Average per-day means | D31, §3.2, §3.8 |
| Q21 | Use the recommended | D32 |
| Q22 | Slug `mood-buddy-2`; bundle ID and package under `moodbuddy2` | D33 (exact strings and scheme: D45) |
| Q23 | Right | D34, §3.9 |
| Q24 | Reviewer's option (d): hidden tabs, no Check-in drawer item | D35, §6.1, §6.2 |
| Q25 | Acceptable | D36, §3.8 |
| Q26 | Correct | D37, §3.6 |
| Q27 | `src/app/` | D38, §6.3 |
| Q28 | Stress and anxiety 1 → 5, 1 = least, 5 = most | D39 (value meaning), §3.1, §3.2, §3.9 (display order: D48) |
| Q29 | No practical effect, add nothing | D40 |
| Q30 | GIF takes up the entire screen | D41, §3.11 |
| Q31 | Keep the normal text | D42, §3.6 |
| Q32 | Confirmed | D43, §2.8 |
| Q33 | "confirmed" (the exact strings proposed: slug `mood-buddy-2`, `com.teddeej.moodbuddy2` for iOS and Android, EAS owner `teddeej`, new EAS project, scheme `moodbuddy2`) | D45, D33, baseline table |
| Q34 | "agreed" (entries dated after "today" after westward travel count as today; Diary/export upper bound extends) | D46, §3.5, §3.3, §3.8 |
| Q35 | "That's okay" (deletes during the TZ grace period don't restore an already-cancelled reminder) | D47, §3.6, §3.8 |
| Q36 | "Yes, discard it" (AI toggle off discards the in-memory chat) | D44, §3.7, §3.10, §6.1 |
| Q37 | "b" (stress and anxiety rendered 5 → 1 so the good end is on the right in all rows; mood 1 → 5; stored values and CSV unchanged) | D48, D25, D39, §3.1, §3.2, §3.9 |

### 7.3 Interactions between answers (resolved by the architect, listed for review)

| Answers | Interaction | Resolution |
|---|---|---|
| Q7 + Q18 + Q19 | Delete-all keeps the AI toggle but removes the key. | No AI prompt and no chat until a new key is saved; then the toggle's kept value applies. |
| Q7 + Q18 | A user who turned AI off in Settings could still see the first-time dialog once a key exists. | Changing the toggle in Settings also marks "prompted" (§3.10). |
| Q8 + D9 | During the 24-hour grace period, reminders fire at the old zone's wall time, and a check-in must still skip the day. | Grace rule and check-in cancel rule in §3.6. |
| Q11 + AGENTS.md | AGENTS.md prefers Expo modules over third-party libraries, but the architect conventions bring in five third-party packages: **MMKV**, **Redux Toolkit** (+ react-redux), **TanStack Query**, **Axios** and **FlashList**. | Owner's explicit Q11 choice wins for all five. SQLite (Expo module) stays for relational data. Axios has an Expo alternative, **`expo/fetch`** (WinterCG fetch with streaming), which would satisfy AGENTS.md better; Axios is kept because Q11 chose the conventions as a whole, and it is noted here in case the owner ever wants to drop it. Route folder: settled by D38 (`src/app/`). |
| Q24 (D35) + D24 | Chat was a hidden drawer screen; with hidden tabs, a drawer-level Chat would show no tab bar and have awkward back behaviour. | Chat becomes a root Stack screen (§6.1); its conversation lives in Redux, so moving it doesn't affect D24. |
| Q28 (D39) + Q14 (D25) + Q37 (D48) | Rendering every row 1 → 5 would have put the good end on opposite sides. | **Settled by the owner (D48, Q37 option b):** D39 fixes what the numbers mean; D48 fixes display order (stress/anxiety 5 → 1), so all rows have the good end on the right, which is what D25 asked for. Stored values and CSV unchanged. Remaining, informational only: dashboard bars grow with the value, so "up" is good for mood and bad for stress/anxiety; captions state it (§3.2). |
| Q36 (D44) + D24 + D29 | D24 listed the chat-clearing events; D29 blocks chat when the toggle is off. | Toggle-off now also clears the conversation (D44). Clearing list everywhere: next handoff, delete-all, toggle-off, app restart (§3.7, §3.10, §6.1, D24). |
| Q30 (D41) + Android platform | Owner wants the GIF full-screen, but Android 12+ native splash can only show a colour and an icon. | Full-screen GIF is delivered by the JS overlay on both platforms; native phase is a matching solid colour (§3.11). |
| Q11 + Q12 | Axios guideline vs Anthropic SDK guidance. | Axios (N1). |
| Q2 + Q4 + D3 | Export range can go past 90 days, but prompts older than 90 days no longer exist. | Those rows export with an empty `diary_prompt` (§3.9). |

---

## Verification log

| Item | Status |
|---|---|
| All old-source citations and constants | Re-read on 2026-10-06. Rev 2 re-read `lib/dashboard-utils.ts:80-126` (bucket line ranges now cited the same in §3.2 and §3.8) and `app.json:30-50` (splash `imageWidth: 200`, `resizeMode: cover` at lines 38-39). |
| Old test results | Ran locally (`TZ=UTC jest --coverage=false`). No files written to the old repo. |
| Contrast ratios | Computed with the WCAG relative-luminance formula |
| v57 notifications, secure-store, file-system, sharing, sqlite, @expo/ui, router drawer | Fetched from docs.expo.dev on 2026-10-06 |
| v57 splash-screen page (Rev 2) | Fetched 2026-10-06: plugin options `image`, `imageWidth` (default 100), `resizeMode` (`contain`/`cover`/`native`), `backgroundColor`, `dark`; Expo Go and development builds don't fully replicate the standalone splash, so test on a release build. The page does **not** state the Android 12+ icon-only limit; that comes from Android platform docs, **not re-fetched**. |
| v57 sharing page (Rev 2) | Fetched 2026-10-06: `shareAsync` returns `Promise<void>`. When it resolves, and whether the target app has finished reading the file, is **not documented** (§3.9). |
| `ReanimatedSwipeable` in react-native-gesture-handler 2.32 | **Installed package only** (`v2:node_modules/react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable`). API not checked against docs. |
| `expo-router/drawer` extra exports, `expo-router/react-navigation` → `DrawerActions` | **Installed package types only**. The drawer docs page doesn't cover them. |
| Sonnet model ID `claude-sonnet-5-5`; `anthropic-version: 2023-06-01` | Anthropic docs (models overview, versions), fetched 2026-10-06 |
| Sonnet 5.5 thinking/refusal behavior and the SDK-vs-fetch guidance | From the `claude-api` reference, not a fetched docs page. Re-check at implementation. |
| `@expo/ui` time picker import path (`drop-in-replacements` vs `community/datetime-picker`) | **Unresolved implementation check** (D26). |
| D23 packages (react-native-mmkv, @reduxjs/toolkit, react-redux, @tanstack/react-query, axios, @shopify/flash-list) on RN 0.86 / New Architecture | Rev 5: installed versions and peers checked 2026-10-07 (§6.3 row); JS side runs under Jest. **Native build of MMKV 4.3.2 / Nitro 0.37.1 on RN 0.86.3 not yet done** (device smoke test pending). Axios and FlashList not installed yet. |
| Rev 3: JS Tabs `href: null` (D35) | v57 "JavaScript tabs" docs (fetched 2026-10-07): `href: null` hides a tab and keeps the route accessible; docs import `Tabs` from `expo-router`. Installed `expo-router/build/layouts/TabsClient.js` confirms (hides the item, renders no button). Installed `build/exports.d.ts` marks `Tabs` from `expo-router` **deprecated** in favour of `expo-router/js-tabs` (types only). Docs have no Drawer-around-Tabs example (**docs-unverified** nesting; the old app uses it). |
| Rev 3: NativeTabs `hidden` | Installed `expo-router/build/native-tabs/types.d.ts`: "Marking a tab as `hidden` means it cannot be navigated to in any way", so NativeTabs can't host D35's hidden tabs. |
| Rev 3: splash limits (D41) | v57 splash docs (fetched 2026-10-07): iOS `enableFullScreenImage_legacy` exists and "will be removed in the future" (also in the installed plugin source); no Android 12+ statement. Android developer docs (fetched 2026-10-07): Android 12+ splash = opaque window colour + centred icon + optional branding image, no full-screen image. GIF and JPG sizes (325×529) from `file`. (Android < 12 rendering, edge-to-edge and the `image` requirement were open in Rev 3; resolved from source in Rev 4, rows below.) |
| Rev 3: notifications APIs for the check-in cancel rule | v57 notifications docs (fetched 2026-10-07): `getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]>`, `cancelScheduledNotificationAsync(identifier)`, `NotificationContentInput.data`. Per-platform shape of a returned `DATE` trigger **unverified** (hence `data.fireAt`). |
| Rev 3: unverified navigation details | Still **device-unverified**: Drawer action bubbling from inside Tabs, `router.navigate` vs `router.dismissTo` when Chat (root Stack) is on top. `expo/fetch` availability in v57 (§7.3 note) not re-checked. (JS Tabs default `backBehavior` resolved in Rev 4, below.) |
| Rev 4 (2026-10-07): Android splash `image` requirement | **Source-verified, not built** (`v2:node_modules/expo-splash-screen` 57.0.9, `plugin/build/`): `withAndroidSplashStyles.js:43-46` always sets `windowSplashScreenAnimatedIcon` = `@drawable/splashscreen_logo`; `withAndroidSplashImages.js:60` (doc comment) and `:89-97` write `splashscreen_logo.png` only when an image is configured; `withAndroidSplashDrawables.js:34` adds the bitmap layer only `image &&`; `getAndroidSplashConfig.js` has no default `image`. Hence a fully transparent PNG as `image` (§3.11, D41). |
| Rev 4: Android minSdk | **Source-verified**: default 24 (`react-native/gradle/libs.versions.toml:3`; `expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoRootProjectPlugin.kt:53` falls back to `"24"`). Android < 12 is in scope. |
| Rev 4: Android < 12 splash | **Source-verified, device-unverified**: plugin styles extend `Theme.SplashScreen` (`withAndroidSplashStyles.js:10,61`) and the module depends on `androidx.core:core-splashscreen:1.2.0` (`expo-splash-screen/android/build.gradle:19`), the AndroidX backport of the Android 12 splash API. |
| Rev 4: Android edge-to-edge | **Source-partially verified** (corrected Rev 5): always on; `@expo/prebuild-config/build/plugins/unversioned/edge-to-edge/withEdgeToEdge.js:26-27` warns that `edgeToEdgeEnabled` "is no longer available - Android 16 makes edge-to-edge mandatory". Old app set it (`app.json:22`); v2 must not. **Source-partially verified** (Rev 5): `withEdgeToEdge.js:26-27` only warns about the key and restores the default theme; it does not write `gradle.properties`. Confirmed after `npx expo prebuild --clean --no-install` on 2026-10-07: `android/gradle.properties:47` has `edgeToEdgeEnabled=true`. |
| Rev 4: JS Tabs `backBehavior` | **Source-verified**: `expo-router/build/react-navigation/routers/TabRouter.js:96` defaults `backBehavior = 'firstRoute'`; `bottom-tabs/navigators/createBottomTabNavigator.js:8-12` passes it through unset. |
| Rev 4: `href` + `tabBarButton` | **Source-verified**: `expo-router/build/layouts/TabsClient.js:17-18` throws when one screen's options set both; `:26-29` replaces `tabBarButton` with a null-returning button when `href == null`. |
| Rev 4: `tabBarHideOnKeyboard` | **Source-verified**: defaults to `false` (`expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js:121,132`). Effect with the screens' keyboard handling is **device-unverified**. |
| Rev 4: `unstable_settings.anchor` | **Source-verified**: read in `expo-router/build/getRoutesCore.js:651-657`; old app uses it at `app/_layout.tsx:16-18`. Cold-start `moodbuddy2://chat` behaviour **device-unverified**. |
| Rev 4: v2 template splash | `v2:app.json:29-34` (`#208AEF`, `splash-icon.png`, `imageWidth: 76`), read 2026-10-07. |
| Rev 4: TanStack Query mutation callbacks and signals | Per-call `mutate()` callbacks not firing after unmount, and mutations getting no `AbortSignal`, are from TanStack Query v5 behaviour as documented, **not re-fetched**; the package is not installed yet. Re-check at install. |
| iOS pending-notification cap, Android channel used for trigger without `channelId`, picker URI location, ZenQuotes terms, `newArchEnabled` acceptance in v57, Hermes `\p{L}` (D22), Hermes `Intl` time-zone name / `expo-localization` zone API (D20) | **Unverified** |
| **Rev 5 (2026-10-07): foundation build** | Checks made while implementing the Foundation plan. Source-verified means the installed package source was read; no native build was run. |
| Rev 5: SQLite minutes modifier | **Verified on Node's SQLite** (`node:sqlite`, Node 24.10): `date('2026-10-07T15:30:00.000Z', '540 minutes')` = `2026-10-08`, `'-300 minutes'` and `tz_offset_min \|\| ' minutes'` work (`src/tests/__tests__/services/migrations.test.ts`). **Device-unverified** for expo-sqlite's bundled SQLite. |
| Rev 5: `SQLiteProvider` renders null until `onInit` finishes | **Source-verified**: `expo-sqlite` 57.0.4 `src/hooks.tsx:239-240` returns `null` while loading. `AppReadyGate` sits inside it, so no screen renders before migrations (fixes B10). |
| Rev 5: `withExclusiveTransactionAsync` and foreign keys | **Source-verified**: `expo-sqlite` `src/SQLiteDatabase.ts:175-186` creates a new `Transaction` connection and runs `BEGIN` before the task, so `PRAGMA foreign_keys = ON` cannot be enabled there and `ON DELETE CASCADE` would not fire. Rule: writes relying on the cascade use `withTransactionAsync` (recorded in v2 `CLAUDE.md`). Migrations use `withTransactionAsync`. |
| Rev 5: prebuild results | `npx expo prebuild --clean --no-install` (2026-10-07; native folders deleted afterwards): `AndroidManifest.xml` has `RECORD_AUDIO` with `tools:node="remove"` (merged-manifest removal; full Gradle merge not run); `splashscreen_logo.png` in all 5 densities, `splashscreen_background` `#2885C8`; `android/gradle.properties:47` `edgeToEdgeEnabled=true`; iOS `TARGETED_DEVICE_FAMILY = "1"`, `UIUserInterfaceStyle` Light, bundle ID and package `com.teddeej.moodbuddy2`, display name "Mood Buddy". |
| Rev 5: Face ID usage string | **Verified via config introspection**: the `expo-secure-store` plugin injects `NSFaceIDUsageDescription` by default (`plugin/build/withSecureStore.js`); `faceIDPermission: false` removes it. v2 uses no biometrics; whether to set it was an owner decision (**decided in Rev 7: D50**, `faceIDPermission: false`). |
| Rev 5: splash colour | Sampled from frame 0 of `clouds_spinner.gif` (copy, Pillow): most frequent sky pixel `#0268B3` (top band), **median sky pixel `#2885C8`** (used, as it represents the whole sky). Recorded in `app.json` and `SPLASH_BACKGROUND`; a test keeps them equal. |
| Rev 5: Jest environment | `jest-expo` 57.0.5 with RNTL 14.0.1 + test-renderer 1.2.0 works. `node:sqlite` loads under jest-expo. MMKV 4 returns its mock under Jest, but `react-native-nitro-modules` throws at import (TurboModule lookup) and needs a stub mock. Reanimated 4 and Worklets need their shipped mocks. expo-router 57.0.25 `renderRouter` attaches `getPathname` etc. to RNTL 14's returned Promise (workaround in the navigation test). `eslint-config-expo` 57 defines no Jest globals. |
| Rev 5: typed routes | `.expo/types/router.d.ts` (git-ignored) is generated by `npx expo start`; `tsc --noEmit` passes both with and without it. |
| **Rev 6 (2026-10-07): foundation review fixes** | Checks made while applying the foundation review's suggestions. No decision changed. |
| Rev 6: `yarn audit --groups dependencies` | **15 findings (5 moderate, 10 high), 0 critical.** Only one reaches the app bundle: `decode-uri-component` 0.2.2 via `expo-router > query-string` (moderate, GHSA-vcc3-ghjq-m6fr: denial of service from exponential decoding of malformed percent-encoded input, i.e. deep-link parsing). Patched only in 0.5.0 (all ≤ 0.4.2 affected), which is not a same-major bump: `query-string` 7 requires `^0.2.2` and 0.5.0 is ESM-only (`"type": "module"`), so no `resolutions` override: **accepted until an SDK/expo-router update ships a fixed `query-string`**. Mitigation: route params and deep links are already treated as untrusted (CLAUDE.md) and the app takes no free-text params. The other 14 are build-time tools only, never bundled: `node-forge` ≤ 1.4.0 (2 high, via `@expo/cli`), `braces` ≤ 3.0.3 (8 high, via `@expo/metro` / metro-file-map > micromatch), `uuid` 7.0.3 (4 moderate, via `@expo/config-plugins > xcode`). Re-run before release. |
| Rev 6: template Android permissions | `app.json` `android.blockedPermissions` now also lists `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (plus `RECORD_AUDIO`). Checked with `npx expo config --type public`; **no prebuild run**, so the merged manifest is unverified until the next prebuild/dev build. `ios.config.usesNonExemptEncryption: false` added (HTTPS only, no custom crypto). |
| Rev 6: Face ID usage string | Was an open owner decision at Rev 6. **Resolved in Rev 7 (D50):** `faceIDPermission: false` set; see the Rev 7 row. |
| Rev 6: theme surfaces | `surfaceVariant` and `elevation.level1–5` are now per-palette tints mixed from white toward `background` (Paper's purple defaults gave `primary` 4.34–4.35:1 on Dialogs and 4.04–4.25:1 on flat TextInputs). `level0` stays `transparent`. Every text token is asserted ≥ 4.5:1 and every UI token ≥ 3:1 on `background`, `surface`, `surfaceVariant` and each opaque elevation level (`contrast.test.ts`). |
| Rev 6: schema v1 timestamp CHECK | `mood_entries.timestamp` and `diary_prompts.timestamp` must match `Date#toISOString()` form (`GLOB` `YYYY-MM-DDTHH:MM:SS.sssZ`), because the UTC search window compares ISO strings lexically. Schema v1 had not shipped, so v1 was edited in place. `localDateKeyFromUtc` also rejects timestamps without `Z`/offset and offsets outside −720…840. |
| **Rev 7 (2026-10-07): owner decisions D49, D50** | Checks made while applying the no-backup and Face ID decisions. No native build or prebuild was run in the repo. |
| Rev 7: Face ID string removed (D50) | **Source-verified and verified via config introspection.** `expo-secure-store` 57.0.4 `plugin/build/withSecureStore.js:8-13` passes `faceIDPermission` to `IOSConfig.Permissions.createPermissionsPlugin`; `@expo/config-plugins` 57.0.10 `build/ios/Permissions.js:28-30` deletes the key when the value is `false`. `npx expo config --type introspect`: with the Rev 6 `app.json` (scratch copy) the Info.plist has `NSFaceIDUsageDescription` "Allow $(PRODUCT_NAME) to access your Face ID biometric data."; with D50 it is absent. Test: `src/tests/__tests__/config/noBackup.test.ts`. |
| Rev 7: Android `allowBackup` (D49) | **Source-verified and verified via config introspection.** `@expo/config-plugins` `build/android/AllowBackup.js:23-35` writes `android:allowBackup` from `android.allowBackup` (default `true`); `@expo/prebuild-config` `withDefaultPlugins.js:154` registers it. Introspection with D49: `android:allowBackup="false"`, `android:fullBackupContent="@xml/secure_store_backup_rules"`, `android:dataExtractionRules="@xml/secure_store_data_extraction_rules"` (Rev 6 config: `allowBackup="true"`). No library manifest under `node_modules` declares `allowBackup`/`fullBackupContent`/`dataExtractionRules` (Maven AARs not checked). **Device-unverified:** the Gradle-merged manifest of a real build (check `android:allowBackup="false"` and no manifest-merger conflict), and `adb shell bmgr`/D2D behaviour. |
| Rev 7: expo-secure-store backup rules (D49) | **Source-verified.** `withSecureStore.js:14-36`: with `configureAndroidBackup: true` (default) it sets both attributes unless other rules are already present (then it only warns); with `false` it removes only its own. The XML (`android/src/main/res/xml/`) includes `sharedpref` `.` and excludes `sharedpref` `SecureStore` in `cloud-backup` and `device-transfer`. Android Auto Backup docs (fetched 2026-10-07): with an `<include>`, only the included files are backed up; on Android 12+ some manufacturers' devices still run device-to-device transfers with `allowBackup="false"`, and `fullBackupContent` rules do not affect D2D (only `dataExtractionRules` do). Hence kept. Residual: shared preferences other than SecureStore (no user data today; expo-notifications may store scheduled reminders there later) could still move in such an OEM D2D transfer. |
| Rev 7: default data directories (D49) | **Source-verified.** expo-sqlite 57.0.4 `ios/SQLiteModule.swift:24-28` `defaultDatabaseDirectory` = `Documents/SQLite` (Android `SQLiteModule.kt:36`: `filesDir/SQLite`). react-native-mmkv 4.3.2 `ios/HybridMMKVPlatformContext.swift` base = `Documents/mmkv` (Android `HybridMMKVPlatformContext.kt:12`: `filesDir/mmkv`); `createMMKV({ path })` overrides it (`src/specs/MMKVFactory.nitro.ts:42-55`). A test asserts no `directory`/`path` overrides exist in `src/`. |
| Rev 7: iOS exclusion semantics (D49) | Apple "Optimizing your app's data for iCloud backup" (fetched 2026-10-07): to exclude a group of files, put them in a directory and set the directory's `isExcludedFromBackup`; "certain file operations can reset resource values", so set it again; the flag is guidance, "not a mechanism to guarantee those items never appear in a backup or on a restored device"; `tmp` and `Library/Caches` are excluded by default. `URLResourceValues.isExcludedFromBackup` page: some operations on user documents reset it. Hence: re-applied on every launch. Whether Finder/iTunes computer backups and iPhone-to-iPhone Quick Start migration honour the flag is **unverified**. |
| Rev 7: local module `modules/no-backup` (D49) | **Source-verified, not built.** expo-modules-autolinking: default `nativeModulesDir` is `./modules` (`build/commands/autolinkingOptions.js:170-172`); a folder without `package.json` is named after the folder (`build/dependencies/scanning.js`). `npx expo-modules-autolinking resolve --platform apple` lists `no-backup` with pod `NoBackup`, module `NoBackupModule` and app-delegate subscriber `NoBackupAppDelegateSubscriber`; not listed for Android (Apple only). `ExpoAppDelegateSubscriberManager.swift:31-40` calls every subscriber's `didFinishLaunchingWithOptions`. `BackupExclusion.swift` type-checks with `swiftc -typecheck` (macOS SDK); the module and subscriber were **not compiled** (no pod install / Xcode build). **Device-unverified:** first iOS development build compiles and links it; on the simulator, after launch, `globalThis.expo.modules.NoBackup.getStatus()` (Metro debugger) returns `excluded: true` for `Documents` and `Library/Application Support`, or on the host `xattr -l` on those directories in the app's data container (`xcrun simctl get_app_container booted com.teddeej.moodbuddy2 data`) shows the expected backup-exclusion attribute `com.apple.metadata:com_apple_backup_excludeItem` (attribute name from general knowledge, **unverified**); repeat after an app update/relaunch. |
