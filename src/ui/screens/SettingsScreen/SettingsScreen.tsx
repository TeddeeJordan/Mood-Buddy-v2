import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './SettingsScreen.props';

/** Placeholder until the Settings feature lands. */
export function SettingsScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" variant="menu" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Settings
        </Text>
      </View>
    </View>
  );
}
