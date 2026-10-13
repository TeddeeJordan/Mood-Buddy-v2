import { StyleSheet, type View } from 'react-native';

import type { AppTheme } from '@/themes/paperTheme';

export interface NoteFieldProps {
  /** Placeholder, e.g. "Stressor 2". */
  name: string;
  /** Accessibility label, e.g. "Stressor 2 of 3". */
  accessibilityLabel: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Called with this field's container (input + counter) when the input gains focus. */
  onFieldFocus?: (field: View | null) => void;
  /**
   * Called with this field's container when the input loses focus, and once more with the
   * container when the field unmounts (it can unmount while focused, without an onBlur).
   * Never called on a plain re-render.
   */
  onFieldBlur?: (field: View | null) => void;
}

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    field: { gap: 2 },
    input: { backgroundColor: theme.colors.surface },
    counter: { color: theme.colors.onSurfaceVariant, alignSelf: 'flex-end' },
  });
