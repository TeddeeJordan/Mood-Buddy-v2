# 002. State and storage stack

**Status:** Accepted. Spec: D2, D23, SPEC §6.3 (and D38 for folder layout).

## Context

`AGENTS.md` says to prefer Expo modules. The owner explicitly chose the architect agent's conventions instead (D23, Q11): MMKV, Redux Toolkit, TanStack Query, Axios and FlashList. Relational data and secrets still need appropriate homes.

## Decision

| Data | Home |
|---|---|
| Entries, diary prompts, profile (relational, range queries, FK cascade) | `expo-sqlite`, read through TanStack Query |
| Non-secret settings (theme, reminder, AI toggle, flags) | `react-native-mmkv`, mirrored in the Redux `settings` slice |
| Anthropic API key | `expo-secure-store` only; Redux holds just a memory-only `hasApiKey` boolean |
| Cross-screen or persisted UI state | Redux Toolkit (sparingly; one slice today) |
| Everything else | Local component or screen-hook state |

Local SQLite reads go through TanStack Query for caching and invalidation; they are local data, so they never live in Redux. Query keys are in `src/services/query/queryKeys.ts`.

## Consequences

- The app needs a development build; Expo Go is not supported (MMKV and Nitro modules).
- Extra dependencies compared with an Expo-only stack; swapping any of them needs owner sign-off.
- A native build of MMKV 4.3.2 / Nitro 0.37.1 on RN 0.86.3 is still to be confirmed on a device (SPEC Verification log).
- Axios and FlashList are chosen but not installed yet.
