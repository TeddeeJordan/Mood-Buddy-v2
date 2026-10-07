import { StyleSheet } from 'react-native';

import type { AppTheme } from '@/themes/paperTheme';

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    title: { color: theme.colors.onBackground },
  });
