# ADR 014: ScreenHeader is a plain-view header, not Paper's `Appbar.Header`

**Status:** Accepted. Related: [ADR 010](010-font-scale-caps.md) (no header cap, WCAG 1.4.4), [ADR 013](013-live-text-size-relayout.md).

## Context

After the header title cap was removed (ADR 010), a large system text size still clipped the title on iOS only. Cause, from react-native-paper 5.15.3 source: `Appbar` renders the bar inside a `Surface`. On iOS, `SurfaceIOS` moves `height` to an outer view and sets `flex: 1` on the inner row whenever any height is set (even `'auto'`), and Paper always sets one. The bar therefore never grows past `minHeight` (64). Android's `Surface` is a single view and does grow.

## Decision

- `ScreenHeader` (`src/ui/components/ScreenHeader/`) is built from plain views that copy Paper's MD3 small-mode layout: a root view with the background colour, safe-area top inset and left/right inset; a row with `paddingHorizontal: 4` and `minHeight: HEADER_MIN_HEIGHT` (64) and **no `height`**.
- Title: iOS centred, with a 52 trailing spacer when there are no actions (centred only with at most 2 trailing actions); Android left-aligned, with a 12 start margin only in the back variant.
- The title is an uncapped, wrapping `Text` (`titleLarge`, `header` role).
- The buttons are still Paper `Appbar.Action` / `Appbar.BackAction`, which work outside an `Appbar`, with `ICON_BUTTON_TOUCH_TARGET`.
- Do not return to `Appbar.Header` / `Appbar`, and do not give the bar a `height`.

## Consequences

- The header grows with the title at any text size on both platforms.
- The copied layout values (insets, 52 spacer, 12 margin, paddings) can drift from Paper. Re-check them on every react-native-paper upgrade.
- We own the header layout and no longer get Paper header changes automatically.
