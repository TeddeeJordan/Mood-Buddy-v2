import { StyleSheet } from 'react-native';

import type { Scale, ScaleValue } from '@/constants/scales';
import type { AppTheme } from '@/themes/paperTheme';

export interface EmojiPickerProps {
  scale: Scale;
  /** `null` = nothing selected (no tile is pre-selected). */
  value: ScaleValue | null;
  onChange: (value: ScaleValue) => void;
  /** Inline validation message shown under the row. */
  errorText?: string;
}

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { gap: 8 },
    question: { color: theme.colors.onSurface },
    // Tight gap leaves more width per tile for the longest label; the tile borders keep tiles apart.
    row: { flexDirection: 'row', gap: 2 },
    // Each caption gets half the row and wraps at large text sizes instead of running into the other.
    endLabels: { flexDirection: 'row', gap: 8 },
    endLabel: { flex: 1, color: theme.colors.onSurfaceVariant },
    endLabelLeft: { textAlign: 'left' },
    endLabelRight: { textAlign: 'right' },
  });
