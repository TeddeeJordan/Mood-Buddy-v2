import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, HelperText, Portal, Snackbar, Text, TextInput } from 'react-native-paper';

import { BIO_LIMIT } from '@/constants/limits';
import { UNCAPPED_FONT_SCALE } from '@/constants/textScaling';
import { useAppTheme } from '@/themes/useAppTheme';
import { ProfileAvatar } from '@/ui/components/ProfileAvatar/ProfileAvatar';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { makeStyles } from './ProfileScreen.props';
import { BIO_LABEL, BIO_LIMIT_MESSAGE, BIO_PLACEHOLDER, SAVED_MESSAGE, useProfileScreen } from './useProfileScreen';

/** Profile (SPEC §1.7): avatar and bio, edited in place behind the header's pencil. */
export function ProfileScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const {
    isEditing,
    cancel,
    isSaving,
    isPickerOpen,
    save,
    startEdit,
    canStartEdit,
    editButtonRef,
    avatarButtonRef,
    scrollRef,
    onScroll,
    onScrollLayout,
    scrollContentRef,
    isLoading,
    loadError,
    retryLoad,
    photoUri,
    pickPhoto,
    canRemovePhoto,
    removePhoto,
    pickError,
    bioFieldRef,
    bioInputRef,
    draftBio,
    setBio,
    onBioFocus,
    onBioBlur,
    onBioFieldLayout,
    bioAtLimit,
    bioCounter,
    bioCounterAccessibilityLabel,
    savedBio,
    saveError,
    snackbarVisible,
    dismissSnackbar,
    leaveDialogVisible,
    keepEditing,
    discardAndLeave,
  } = useProfileScreen();

  const actions = isEditing
    ? [
        { icon: 'close', accessibilityLabel: 'Cancel editing', onPress: cancel, disabled: isSaving || isPickerOpen },
        { icon: 'check', accessibilityLabel: 'Save profile', onPress: save, disabled: isSaving || isPickerOpen },
      ]
    : [
        {
          icon: 'pencil',
          accessibilityLabel: 'Edit profile',
          onPress: startEdit,
          disabled: !canStartEdit,
          ref: editButtonRef,
        },
      ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" variant="menu" actions={actions} />
      {/* `padding` on both platforms, no offset: same reasoning as HomeScreen. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={onScrollLayout}
          keyboardShouldPersistTaps="handled">
          <View ref={scrollContentRef} style={styles.scrollContent}>
            {isLoading ? (
              <ActivityIndicator accessibilityLabel="Loading profile" />
            ) : loadError ? (
              <View style={styles.centered}>
                <HelperText type="error" visible maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}>
                  {loadError}
                </HelperText>
                <Button
                  mode="outlined"
                  onPress={retryLoad}
                  style={styles.textButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.textButtonLabel}>
                  Try again
                </Button>
              </View>
            ) : (
              <>
                <View style={styles.centered}>
                  <ProfileAvatar
                    ref={avatarButtonRef}
                    photoUri={photoUri}
                    editable={isEditing}
                    onPress={pickPhoto}
                    disabled={isSaving || isPickerOpen}
                  />
                  {canRemovePhoto ? (
                    <Button
                      mode="text"
                      icon="delete-outline"
                      onPress={removePhoto}
                      disabled={isSaving || isPickerOpen}
                      style={styles.textButton}
                      contentStyle={styles.buttonContent}
                      labelStyle={styles.textButtonLabel}>
                      Remove photo
                    </Button>
                  ) : null}
                  {pickError ? (
                    <HelperText type="error" visible maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}>
                      {pickError}
                    </HelperText>
                  ) : null}
                </View>
                {isEditing ? (
                  <View ref={bioFieldRef} onLayout={onBioFieldLayout}>
                    {/* A static label above the field, not Paper's floating `label`: Paper places the
                        outlined label with fixed font-size constants, so at large text sizes it is
                        clipped and overlaps the outline. This one wraps and grows. Hidden from screen
                        readers because the input's accessibilityLabel already names it "Bio". */}
                    <Text
                      variant="labelLarge"
                      style={styles.bioLabel}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants">
                      {BIO_LABEL}
                    </Text>
                    <TextInput
                      ref={bioInputRef}
                      mode="outlined"
                      accessibilityLabel={BIO_LABEL}
                      value={draftBio}
                      onChangeText={setBio}
                      // Native cap; setBio's clampBio stays as defence in depth.
                      maxLength={BIO_LIMIT}
                      // Entering edit mode focuses the bio. Native autoFocus focuses once the view is
                      // attached, on both platforms; a JS focus() right after mount can be dropped on Android.
                      autoFocus
                      onFocus={onBioFocus}
                      onBlur={onBioBlur}
                      multiline
                      scrollEnabled
                      editable={!isSaving}
                      maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}
                      style={styles.bioInput}
                    />
                    <View style={styles.counterRow}>
                      {bioAtLimit ? (
                        <HelperText
                          type="info"
                          visible
                          maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}
                          style={styles.limitMessage}>
                          {BIO_LIMIT_MESSAGE}
                        </HelperText>
                      ) : null}
                      <HelperText
                        type="info"
                        visible
                        maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}
                        style={styles.counter}
                        accessibilityLabel={bioCounterAccessibilityLabel}>
                        {bioCounter}
                      </HelperText>
                    </View>
                  </View>
                ) : (
                  <Text variant="bodyLarge" style={savedBio ? styles.bio : styles.bioPlaceholder}>
                    {savedBio || BIO_PLACEHOLDER}
                  </Text>
                )}
                {saveError ? (
                  <HelperText type="error" visible maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}>
                    {saveError}
                  </HelperText>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
        <Snackbar visible={snackbarVisible} onDismiss={dismissSnackbar} wrapperStyle={styles.snackbarWrapper}>
          {SAVED_MESSAGE}
        </Snackbar>
      </KeyboardAvoidingView>
      <Portal>
        <Dialog visible={leaveDialogVisible} onDismiss={keepEditing}>
          <Dialog.Title accessibilityRole="header">Discard changes?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Your profile changes haven&apos;t been saved.</Text>
          </Dialog.Content>
          {/* Wraps: at large text the second button moves under the first instead of clipping. */}
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={keepEditing}
              style={styles.textButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.textButtonLabel}>
              Keep editing
            </Button>
            <Button
              onPress={discardAndLeave}
              style={styles.textButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.textButtonLabel}>
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
