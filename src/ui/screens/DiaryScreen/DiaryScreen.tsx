import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './DiaryScreen.props';

/** Placeholder until the Diary feature lands. */
export function DiaryScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Diary" variant="menu" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Diary
        </Text>
      </View>
    </View>
  );
}
