import type { RefObject } from 'react';
import { StyleSheet, type View } from 'react-native';

import type { AppTheme } from '@/themes/paperTheme';

export const AVATAR_SIZE = 120;
const BADGE_SIZE = 36;

export interface ProfileAvatarProps {
  /** Displayable URI (stored photo or the picked draft), or null for the placeholder icon. */
  photoUri: string | null;
  /** Edit mode: the avatar is a button that opens the photo picker. */
  editable: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** The edit-mode button, so the screen can move screen-reader focus to it (e.g. after Remove photo). */
  ref?: RefObject<View | null>;
}

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { width: AVATAR_SIZE, height: AVATAR_SIZE, alignSelf: 'center' },
    button: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
    image: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.colors.surfaceVariant,
    },
    placeholder: { backgroundColor: theme.colors.primaryContainer },
    // Decorative "change" badge in edit mode; the button's label carries the meaning.
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondaryContainer,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
  });
