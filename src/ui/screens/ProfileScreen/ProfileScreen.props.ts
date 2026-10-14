import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

/** The bio field grows up to this height, then scrolls inside. */
export const BIO_MAX_HEIGHT = 240;

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },
    centered: { alignItems: 'center', gap: 8 },
    bio: { color: theme.colors.onBackground },
    bioPlaceholder: { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' },
    // Visible label above the bio field (replaces Paper's floating label; see ProfileScreen).
    bioLabel: { color: theme.colors.onSurfaceVariant, marginBottom: 4 },
    bioInput: { maxHeight: BIO_MAX_HEIGHT, backgroundColor: theme.colors.background },
    // Wraps at large text sizes: the counter moves under the limit message instead of clipping.
    counterRow: { flexDirection: 'row', flexWrap: 'wrap' },
    limitMessage: { flexShrink: 1 },
    // Right-aligned, with or without the limit message before it.
    counter: { marginLeft: 'auto', flexShrink: 1 },
    // minHeight (not height) so the button grows with the text and keeps the 48dp target.
    buttonContent: { minHeight: MIN_TOUCH_TARGET },
    // Paper's Button label is one line; never let a button (any mode, dialog actions too) grow
    // wider than its container.
    textButton: { maxWidth: '100%' },
    textButtonLabel: { flexShrink: 1 },
    // Paper lays dialog actions out in one row; at large text the second wraps under the first
    // (still right-aligned) instead of both being squeezed.
    dialogActions: { flexWrap: 'wrap', rowGap: 8 },
    // Paper pads the Snackbar by the bottom safe-area inset; here it sits above the tab bar.
    snackbarWrapper: { paddingBottom: 0 },
  });
