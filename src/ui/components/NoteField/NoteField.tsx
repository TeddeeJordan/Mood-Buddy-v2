import { View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { NOTE_MAX_LENGTH } from '@/constants/limits';
import { useAppTheme } from '@/themes/useAppTheme';

import { makeStyles, type NoteFieldProps } from './NoteField.props';
import { useNoteField } from './useNoteField';

/** One optional note input (max 50 characters) with its `n/50` counter (SPEC §1.3, §3.3). */
export function NoteField({
  name,
  accessibilityLabel,
  value,
  onChangeText,
  onFieldFocus,
  onFieldBlur,
}: NoteFieldProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { containerRef, focus, blur } = useNoteField({ onFieldFocus, onFieldBlur });
  return (
    <View ref={containerRef} style={styles.field}>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        onFocus={focus}
        onBlur={blur}
        placeholder={name}
        accessibilityLabel={accessibilityLabel}
        maxLength={NOTE_MAX_LENGTH}
        style={styles.input}
      />
      <Text
        variant="labelSmall"
        style={styles.counter}
        accessibilityLabel={`${value.length} of ${NOTE_MAX_LENGTH} characters`}>
        {`${value.length}/${NOTE_MAX_LENGTH}`}
      </Text>
    </View>
  );
}
