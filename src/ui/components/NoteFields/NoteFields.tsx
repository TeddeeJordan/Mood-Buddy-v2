import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { NoteField } from '@/ui/components/NoteField/NoteField';

import { makeStyles, type NoteFieldsProps } from './NoteFields.props';

/** Three optional note inputs (max 50 characters each) with an `n/50` counter (SPEC §1.3, §3.3). */
export function NoteFields({
  label,
  itemName,
  notes,
  onChangeNote,
  onFieldFocus,
  onFieldBlur,
}: NoteFieldsProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <Text variant="bodyLarge" style={styles.label}>
        {label}
      </Text>
      {notes.map((note, index) => {
        const name = `${itemName} ${index + 1}`;
        return (
          <NoteField
            key={name}
            name={name}
            accessibilityLabel={`${name} of ${notes.length}`}
            value={note}
            onChangeText={(text) => onChangeNote(index, text)}
            onFieldFocus={onFieldFocus}
            onFieldBlur={onFieldBlur}
          />
        );
      })}
    </View>
  );
}
