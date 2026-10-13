# ADR 010: Font-scale caps on emoji tiles and the screen header

**Status:** Accepted (owner-approved exception to WCAG 1.4.4)

## Context

WCAG 1.4.4 (Resize Text) expects text to scale to 200% without loss of content. Two places cannot grow that far on a phone:

- **Emoji tiles.** Each check-in row shows 5 tiles side by side (D48, SPEC §3.1), so each tile gets about a fifth of the screen width. Unbounded system text sizes make the single-word labels (longest: "Stressfree") and the emoji clip or wrap mid-word.
- **Screen header.** Paper's `Appbar` has a fixed height (64). An unbounded `titleLarge` title clips at the largest accessibility text sizes.

## Decision

Cap `maxFontSizeMultiplier` below 2.0 in these places only:

- Tile labels: `TILE_LABEL_MAX_FONT_SCALE = 1.5` (`src/ui/widgets/EmojiTile/EmojiTile.props.ts`). Labels also shrink to fit on one line (`TILE_LABEL_MIN_FONT_SCALE`).
- Tile emoji: `TILE_EMOJI_MAX_FONT_SCALE = 1.2` (same file).
- Header title: `HEADER_TITLE_MAX_FONT_SCALE = 1.5` (`src/ui/components/ScreenHeader/ScreenHeader.props.ts`).

The owner accepted this as an exception to WCAG 1.4.4. Every other text keeps the platform default (no cap).

## Consequences

- At the largest system text sizes, tile labels, emoji and the header title stop growing at 150% / 120% / 150%. They never clip or break mid-word.
- Each tile's meaning is still available at any size through its word-only accessibility label (screen readers) and the row's end labels, which are not capped.
- Any new cap below 2.0 needs its own ADR (or an update to this one while it is current), per the CLAUDE.md accessibility conventions. Re-check the caps if the tile layout or the Appbar height changes.
