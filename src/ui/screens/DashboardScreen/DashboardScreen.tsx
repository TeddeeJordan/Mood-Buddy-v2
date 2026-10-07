import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './DashboardScreen.props';

/** Placeholder until the Dashboard feature lands. */
export function DashboardScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Dashboard" variant="menu" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Dashboard
        </Text>
      </View>
    </View>
  );
}
