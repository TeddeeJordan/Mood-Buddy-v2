# ADR 012: Leave-guard registry for unsaved edits

**Status:** Accepted. Spec: §1.7 (Profile). Owner decision Q3 (confirm, then discard, when leaving mid-edit). Related: [ADR 001](001-navigation-drawer-js-tabs.md).

## Context

Leaving Profile in edit mode with unsaved changes should ask "Discard changes?". React Navigation's usual tools (`beforeRemove`, `usePreventRemove`) do not fire here: JS Tabs keep a screen mounted when another tab or drawer item is chosen, so nothing is removed.

## Decision

A small registry (`src/hooks/useLeaveGuard.ts`) holds the focused screen's guard, `(proceed) => boolean`. `true` means the guard blocked the leave and will call `proceed` only if the user confirms. `LeaveGuardProvider` (around the Drawer) provides one stable registry. Entry points ask it before navigating:

- Tabs `tabPress`, through `useTabLeaveGuardListeners` (`screenListeners`).
- Drawer items, through `useRequestLeave` in `useAppDrawerContent` (the drawer closes first so the dialog is not covered).
- Android hardware back, in `useLeaveGuard`. While the drawer is open the guard is skipped so back closes the drawer.

`useLeaveGuard(guard, onBlur)` registers while the screen is focused and runs `onBlur` on any loss of focus (also routes no guard sees, such as a deep link), where Profile drops its draft. Outside a provider nothing is blocked, so screens render alone in tests.

## Consequences

- Leaving confirms and then discards the draft; the X (Cancel) button does not ask.
- Every new navigation entry point must call the registry, or it bypasses the guard. Only one guard is active at a time.
- Any future screen with unsaved edits (for example Settings) can reuse it.
