import { View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';

import { displayOptions } from '@/constants/scales';
import { useAppTheme } from '@/themes/useAppTheme';
import { EmojiTile } from '@/ui/widgets/EmojiTile/EmojiTile';

import { makeStyles, type EmojiPickerProps } from './EmojiPicker.props';

/**
 * A controlled radio row for one scale (SPEC §3.1, §3.2). Tiles render in display order
 * (mood 1 → 5, stress/anxiety 5 → 1) in the view tree, so screen-reader order matches visual
 * order. The end labels are visual only: each tile's label already carries its direction.
 */
export function EmojiPicker({ scale, value, onChange, errorText }: EmojiPickerProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [leftLabel, rightLabel] = scale.endLabels;
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" accessibilityRole="header" style={styles.question}>
        {scale.question}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={scale.question} style={styles.row}>
        {displayOptions(scale).map((option) => (
          <EmojiTile
            key={option.value}
            metric={scale.metric}
            option={option}
            selected={value === option.value}
            onSelect={onChange}
          />
        ))}
      </View>
      <View
        style={styles.endLabels}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Text variant="labelSmall" style={[styles.endLabel, styles.endLabelLeft]}>
          {leftLabel}
        </Text>
        <Text variant="labelSmall" style={[styles.endLabel, styles.endLabelRight]}>
          {rightLabel}
        </Text>
      </View>
      {errorText ? (
        <HelperText type="error" visible>
          {errorText}
        </HelperText>
      ) : null}
    </View>
  );
}
