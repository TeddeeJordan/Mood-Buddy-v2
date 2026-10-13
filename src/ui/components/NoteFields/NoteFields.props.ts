import { StyleSheet, type View } from 'react-native';

import type { AppTheme } from '@/themes/paperTheme';
import type { NoteTriple } from '@/utils/checkIn';

export interface NoteFieldsProps {
  /** Section prompt, e.g. "What do you think is stressing you out?". */
  label: string;
  /** Placeholder / accessibility prefix: "Stressor" or "Trigger". */
  itemName: string;
  notes: NoteTriple;
  onChangeNote: (index: number, text: string) => void;
  /** Called with the focused field's container (input + counter), e.g. to scroll it above the keyboard. */
  onFieldFocus?: (field: View | null) => void;
  /** Called with the container of the field that lost focus, or that unmounted (never on a re-render). */
  onFieldBlur?: (field: View | null) => void;
}

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { gap: 8 },
    label: { color: theme.colors.onSurface },
  });
