import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';

import { makeStyles, type ScreenHeaderProps } from './ScreenHeader.props';
import { useScreenHeader } from './useScreenHeader';

/**
 * Screen header laid out like Paper's MD3 `Appbar.Header`, built from plain views so it grows with
 * the title on iOS too (see `HEADER_MIN_HEIGHT`). The actions are still Paper `Appbar.Action` /
 * `Appbar.BackAction`, which work outside an `Appbar`.
 */
export function ScreenHeader({ title, variant = 'menu', actions }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const { openDrawer, goBack, layout, showTrailingSpacer } = useScreenHeader({ variant, actions });
  const styles = makeStyles(theme, layout);
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
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
        <View style={styles.titleContainer}>
          {/* Wraps instead of truncating, and the bar grows with it. Not capped (WCAG 1.4.4). */}
          <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
        {actions?.map((action) => (
          <Appbar.Action
            key={action.accessibilityLabel}
            ref={action.ref}
            icon={action.icon}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityLabel={action.accessibilityLabel}
            style={styles.action}
          />
        ))}
        {showTrailingSpacer ? <View style={styles.trailingSpacer} /> : null}
      </View>
    </View>
  );
}
