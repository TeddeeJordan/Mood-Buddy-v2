import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

export const STRESS_NOTES_LABEL = 'What do you think is stressing you out?';
export const ANXIETY_NOTES_LABEL = 'Have you thought about what is triggering your anxiety?';

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    scrollContent: { padding: 16, gap: 24 },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    submitContent: { minHeight: MIN_TOUCH_TARGET },
    // Paper's Button label is one line: never wider than the footer; the label shrinks instead.
    submitButton: { maxWidth: '100%' },
    submitLabel: { flexShrink: 1 },
    // Paper pads the Snackbar by the bottom safe-area inset; here it sits above the footer and tab bar.
    snackbarWrapper: { paddingBottom: 0 },
  });
