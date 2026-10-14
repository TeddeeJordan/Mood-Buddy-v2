# ADR 013: Live system text-size changes use a JS re-layout pass

**Status:** Accepted. Owner-approved app-wide. Related: [ADR 010](010-font-scale-caps.md) (WCAG 1.4.4), `plugins/withAndroidFontScaleConfigChange.js`.

## Context

When the system text size changes while the app runs, React Native re-measures text natively, but React keeps its own shadow nodes with the layout from the old scale and reuses them on the next commit. Boxes keep their old size while glyphs use the new one: titles and labels clip when text grows, boxes stay oversized when it shrinks. Remounting would lose drafts, focus and scroll position.

## Decision

- `useFontScaleRelayoutPass()` (`src/hooks/useFontScaleRelayoutPass.ts`) returns a number that changes when `useWindowDimensions().fontScale` changes, and once more after `FONT_SCALE_RELAYOUT_DELAY_MS` (500 ms), so one pass lands after the native side has applied the scale.
- `withTextRelayoutPass(theme, pass)` (`src/themes/paperTheme.ts`) flips `fontStyle: 'normal'` on every Paper font on odd passes. That is the default value, so nothing looks different, but each Paper text node gets a changed prop and re-measures. `usePaperTheme` applies it, so it covers all Paper text.
- Text Paper does not render (JS tab bar labels) uses `textRelayoutStyle(theme)` as `tabBarLabelStyle`.
- Plain React Native `Text` outside Paper is not covered. `ScreenHeader` uses a Paper `Text`, so it is covered.
- The Android config plugin stays, so a Font size change does not recreate the activity and drop drafts.

## Consequences

- Nothing is remounted; drafts, focus and scroll positions survive.
- Android limit: while the app stays in the foreground, a font-scale change does not reach JS until the next resume (`DeviceInfoModule.onHostResume`), so the relayout runs when the user comes back from Settings.
- Depends on React Native internals and Paper's use of `theme.fonts`. Re-check on React Native and Paper upgrades.
