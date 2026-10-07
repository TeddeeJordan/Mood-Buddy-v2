import { DrawerContentScrollView } from 'expo-router/drawer';
import { View } from 'react-native';
import { Drawer, IconButton, Text } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';

import { makeStyles, type AppDrawerContentProps } from './AppDrawerContent.props';
import { useAppDrawerContent } from './useAppDrawerContent';

export function AppDrawerContent(props: AppDrawerContentProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { items, onSelect, onClose } = useAppDrawerContent(props);

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
          Mood Buddy
        </Text>
        <IconButton
          icon="close"
          onPress={onClose}
          accessibilityLabel="Close menu"
          style={styles.closeButton}
        />
      </View>
      {items.map((item) => (
        // Active = pill + border + filled icon. Paper's Drawer.Item sets accessibilityRole="button" and accessibilityState={{ selected: active }}.
        <Drawer.Item
          key={item.pathname}
          label={item.label}
          icon={item.shownIcon}
          active={item.active}
          style={item.active ? styles.activeItem : undefined}
          accessibilityLabel={item.label}
          onPress={() => onSelect(item)}
        />
      ))}
    </DrawerContentScrollView>
  );
}
