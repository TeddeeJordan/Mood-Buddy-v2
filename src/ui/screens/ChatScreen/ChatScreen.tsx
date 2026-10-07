import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './ChatScreen.props';

/** Placeholder until the Chat feature lands. */
export function ChatScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Chat" variant="back" />
      <View style={styles.body}>
        <Text variant="headlineSmall" style={styles.title}>
          Chat
        </Text>
      </View>
    </View>
  );
}
