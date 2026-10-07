# 003. Scale model: stored meaning vs. display order

**Status:** Accepted. Spec: D4, D39, D48 (SPEC §3.1, §3.2).

## Context

The old app stored stress and anxiety so that a higher number meant less. The owner reversed that (D4) and later chose a different on-screen order so the "good" end is on the right in all three rows (D48).

## Decision

- **Stored meaning (D39):** mood 1 = worst … 5 = best; stress and anxiety 1 = least … 5 = most. CSV values and headers follow this.
- **Display order (D48):** mood renders 1 → 5; stress and anxiety render 5 → 1, left to right. This is a rendering rule only.
- `src/constants/scales.ts` keeps every scale's `options` in value order. UI code uses `displayOptions(scale)`; it never reorders or reverses stored values.
- Note fields appear for stress or anxiety **≥ 4**, evaluated on the stored value by `requiresNotes()` (`NOTE_THRESHOLD` in `src/constants/limits.ts`), never on tile position.
- Tile accessibility labels are word-only (`tileAccessibilityLabel`), e.g. "Stressed, high stress"; no numbers.

## Consequences

- Dashboard bars grow with the stored value: taller is better for mood, worse for stress and anxiety.
- The notes rule maps to the two leftmost stress and anxiety tiles on screen, which is easy to misread; tests (`src/tests/__tests__/constants/scales.test.ts`) pin the behaviour.
- Screen-reader and focus order follow visual order.
