import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './ProfileScreen.props';

/** Placeholder until the Profile feature lands. */
export function ProfileScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" variant="menu" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Profile
        </Text>
      </View>
    </View>
  );
}
