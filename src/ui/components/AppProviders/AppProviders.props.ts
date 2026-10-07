import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

export interface AppProvidersProps {
  children: ReactNode;
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
});
