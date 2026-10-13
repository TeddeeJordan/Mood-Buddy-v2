import { View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { tileAccessibilityLabel } from '@/constants/scales';
import { useAppTheme } from '@/themes/useAppTheme';

import {
  makeStyles,
  TILE_BADGE_SIZE,
  TILE_EMOJI_MAX_FONT_SCALE,
  TILE_LABEL_MAX_FONT_SCALE,
  TILE_LABEL_MIN_FONT_SCALE,
  type EmojiTileProps,
} from './EmojiTile.props';

/**
 * One radio tile. Selected state is not colour-only: besides the container fill, the ≥ 3:1
 * border doubles in width (1 → 2) and a check badge appears. The label keeps its weight so the
 * longest word stays legible. The badge is decorative; `checked` carries the state.
 */
export function EmojiTile({ metric, option, selected, onSelect }: EmojiTileProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableRipple
      onPress={() => onSelect(option.value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={tileAccessibilityLabel(option)}
      style={[styles.tile, selected && styles.tileSelected]}
      testID={`emoji-tile-${metric}-${option.value}`}>
      <>
        <Text style={styles.emoji} maxFontSizeMultiplier={TILE_EMOJI_MAX_FONT_SCALE}>
          {option.emoji}
        </Text>
        <Text
          variant="labelSmall"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={TILE_LABEL_MIN_FONT_SCALE}
          maxFontSizeMultiplier={TILE_LABEL_MAX_FONT_SCALE}
          style={[styles.label, selected && styles.labelSelected]}>
          {option.label}
        </Text>
        {selected ? (
          <View
            style={styles.badge}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Icon source="check-circle" size={TILE_BADGE_SIZE} color={theme.colors.onPrimaryContainer} />
          </View>
        ) : null}
      </>
    </TouchableRipple>
  );
}
