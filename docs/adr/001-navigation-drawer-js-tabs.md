# 001. Drawer around JS Tabs with hidden tabs; Chat above the drawer

**Status:** Accepted. Spec: D7, D17, D35 (SPEC §1.2, §6.1).

## Context

The owner wants to keep a drawer (D7) whose menu holds only Diary, Profile and Settings (D17), while the tab bar (Home, Dashboard) stays visible so there is always a way back to Home. The template's `NativeTabs` cannot be used: its hidden tabs cannot be navigated to. Chat should sit above everything, not inside the drawer.

## Decision

- Root `Stack` → `Drawer` → JS `Tabs` (`src/app/_layout.tsx`, `src/app/(drawer)/_layout.tsx`, `src/app/(drawer)/(tabs)/_layout.tsx`).
- `Tabs` is imported only from `expo-router/js-tabs`. Home and Dashboard are visible tabs; Diary, Profile and Settings are tabs with `options={{ href: null }}` (object form; a function form ignores `href`), so they are navigable but not shown in the bar.
- Chat is a root Stack screen (`src/app/chat.tsx`). `unstable_settings.anchor = '(drawer)'` keeps the drawer mounted underneath on a cold start into `/chat`.
- No direct `@react-navigation/*` imports; use `expo-router/drawer` and `expo-router/react-navigation`. ESLint enforces this and the tab import rule (`eslint.config.js`).
- `HapticTabButton` is set only in Tabs `screenOptions.tabBarButton`.

## Consequences

- The tab bar stays visible on Diary, Profile and Settings; Android back goes Home, then exits (default `backBehavior`).
- JS tabs, not native tabs: no native tab-bar look, but hidden tabs work.
- Hidden-tab options and the haptic button placement are easy to get wrong, hence the lint rules and the conventions in CLAUDE.md. A navigation test covers the structure (`src/tests/__tests__/app/navigation.test.tsx`).
