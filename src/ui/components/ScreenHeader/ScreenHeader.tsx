import { Appbar } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';

import { HEADER_TITLE_MAX_FONT_SCALE, makeStyles, type ScreenHeaderProps } from './ScreenHeader.props';
import { useScreenHeader } from './useScreenHeader';

export function ScreenHeader({ title, variant = 'menu' }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { openDrawer, goBack } = useScreenHeader();
  return (
    <Appbar.Header style={styles.header}>
      {variant === 'back' ? (
        <Appbar.BackAction onPress={goBack} accessibilityLabel="Go back" style={styles.action} />
      ) : (
        <Appbar.Action
          icon="menu"
          onPress={openDrawer}
          accessibilityLabel="Open menu"
          style={styles.action}
        />
      )}
      <Appbar.Content title={title} titleMaxFontSizeMultiplier={HEADER_TITLE_MAX_FONT_SCALE} />
    </Appbar.Header>
  );
}
