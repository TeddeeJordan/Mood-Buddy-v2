import { Image } from 'expo-image';
import { View } from 'react-native';
import { Avatar, Icon, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/themes/useAppTheme';

import { AVATAR_SIZE, makeStyles, type ProfileAvatarProps } from './ProfileAvatar.props';

export const PHOTO_LABEL = 'Profile photo';
export const CHANGE_PHOTO_LABEL = 'Change profile photo';
export const ADD_PHOTO_LABEL = 'Add profile photo';

/**
 * 120pt circular avatar: the photo (expo-image, cover) or an account-icon placeholder.
 * View mode: the photo is an image labelled "Profile photo"; the placeholder is hidden from
 * screen readers. Edit mode: the whole avatar (120 > 48) is one button, "Change profile photo"
 * (or "Add profile photo" when there is none).
 */
export function ProfileAvatar({ photoUri, editable, onPress, disabled, ref }: ProfileAvatarProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const picture =
    photoUri !== null ? (
      <Image
        source={{ uri: photoUri }}
        style={styles.image}
        contentFit="cover"
        // Local file with a unique name per save, so the memory/disk cache never goes stale.
        cachePolicy="memory"
        transition={150}
        accessible={!editable}
        accessibilityRole={editable ? undefined : 'image'}
        accessibilityLabel={editable ? undefined : PHOTO_LABEL}
      />
    ) : (
      <View
        importantForAccessibility={editable ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!editable}>
        <Avatar.Icon
          size={AVATAR_SIZE}
          icon="account"
          color={theme.colors.onPrimaryContainer}
          style={styles.placeholder}
          accessible={false}
        />
      </View>
    );

  if (!editable) return <View style={styles.container}>{picture}</View>;

  return (
    <View style={styles.container}>
      <TouchableRipple
        ref={ref}
        onPress={onPress}
        disabled={disabled}
        borderless
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={photoUri === null ? ADD_PHOTO_LABEL : CHANGE_PHOTO_LABEL}
        accessibilityState={{ disabled: disabled === true }}>
        <View>
          {picture}
          <View style={styles.badge} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Icon source="camera" size={20} color={theme.colors.onSecondaryContainer} />
          </View>
        </View>
      </TouchableRipple>
    </View>
  );
}
