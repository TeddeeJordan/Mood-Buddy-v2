/** Minimum touch target: 48dp on Android, which also clears the 44pt iOS minimum. */
export const MIN_TOUCH_TARGET = 48;

/**
 * Container style for Paper MD3 `IconButton` / `Appbar.Action` / `Appbar.BackAction`.
 *
 * By default these are a 40x40 container (24 icon + 2 * 8 padding) with a 6 margin and
 * `overflow: 'hidden'`. Paper's own `hitSlop` and any `hitSlop` we pass sit on the inner
 * touchable, so the clipping container cuts them off on both platforms: a `hitSlop` prop
 * cannot enlarge the target. Instead, grow the container to 48x48 and shrink the margin
 * from 6 to 2, so the layout footprint stays 52x52 and the 24 icon stays centred.
 * `borderRadius` keeps the ripple circular (Paper derives it from the 40 default otherwise).
 *
 * Re-check this whenever react-native-paper is upgraded: it depends on Paper's internals
 * (the 40 default size, the 6 margin and the container's `overflow: 'hidden'`). If any of
 * those change, the target size or layout footprint may silently change with them.
 */
export const ICON_BUTTON_TOUCH_TARGET = {
  width: MIN_TOUCH_TARGET,
  height: MIN_TOUCH_TARGET,
  borderRadius: MIN_TOUCH_TARGET / 2,
  margin: 2,
} as const;
