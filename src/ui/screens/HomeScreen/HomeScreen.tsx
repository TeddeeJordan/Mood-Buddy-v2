import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './HomeScreen.props';

/** Placeholder until the Home feature lands. */
export function HomeScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Home" variant="menu" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Home
        </Text>
      </View>
    </View>
  );
}
