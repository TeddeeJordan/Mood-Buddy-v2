import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { Button, HelperText, Snackbar } from 'react-native-paper';

import { ANXIETY_SCALE, MOOD_SCALE, STRESS_SCALE } from '@/constants/scales';
import { useAppTheme } from '@/themes/useAppTheme';
import { EmojiPicker } from '@/ui/components/EmojiPicker/EmojiPicker';
import { NoteFields } from '@/ui/components/NoteFields/NoteFields';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

import { ANXIETY_NOTES_LABEL, makeStyles, STRESS_NOTES_LABEL } from './HomeScreen.props';
import { SAVED_MESSAGE, useHomeScreen } from './useHomeScreen';

/** Mood check-in (SPEC §1.3): three scale rows, notes for high stress/anxiety, sticky Submit. */
export function HomeScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const {
    values,
    notes,
    showStressNotes,
    showAnxietyNotes,
    rowError,
    rowLayout,
    selectValue,
    changeNote,
    submit,
    isSaving,
    saveError,
    snackbarVisible,
    dismissSnackbar,
    scrollRef,
    scrollContentRef,
    onScroll,
    onScrollLayout,
    revealField,
    forgetField,
  } = useHomeScreen();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Home" variant="menu" />
      {/*
        `padding` on both platforms: Android runs edge-to-edge, so the window no longer resizes for
        the keyboard (adjustResize has no effect) and the view must pad itself. The screen starts at
        the window top (no navigator header), so no `keyboardVerticalOffset` is needed. On Android
        the tab bar hides with the keyboard; the screen then grows to the window bottom and the
        view re-measures, so the padding is the full keyboard height with no gap or double offset.
      */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={onScrollLayout}
            keyboardShouldPersistTaps="handled">
            {/* Positions for scrolling (rows, focused note field) are measured against this view. */}
            <View ref={scrollContentRef} style={styles.scrollContent}>
              <View onLayout={rowLayout('mood')}>
                <EmojiPicker
                  scale={MOOD_SCALE}
                  value={values.mood}
                  onChange={selectValue('mood')}
                  errorText={rowError('mood')}
                />
              </View>
              <View onLayout={rowLayout('stress')}>
                <EmojiPicker
                  scale={STRESS_SCALE}
                  value={values.stress}
                  onChange={selectValue('stress')}
                  errorText={rowError('stress')}
                />
              </View>
              {showStressNotes ? (
                <NoteFields
                  label={STRESS_NOTES_LABEL}
                  itemName="Stressor"
                  notes={notes.stress}
                  onChangeNote={changeNote('stress')}
                  onFieldFocus={revealField}
                  onFieldBlur={forgetField}
                />
              ) : null}
              <View onLayout={rowLayout('anxiety')}>
                <EmojiPicker
                  scale={ANXIETY_SCALE}
                  value={values.anxiety}
                  onChange={selectValue('anxiety')}
                  errorText={rowError('anxiety')}
                />
              </View>
              {showAnxietyNotes ? (
                <NoteFields
                  label={ANXIETY_NOTES_LABEL}
                  itemName="Trigger"
                  notes={notes.anxiety}
                  onChangeNote={changeNote('anxiety')}
                  onFieldFocus={revealField}
                  onFieldBlur={forgetField}
                />
              ) : null}
            </View>
          </ScrollView>
          <Snackbar
            visible={snackbarVisible}
            onDismiss={dismissSnackbar}
            wrapperStyle={styles.snackbarWrapper}>
            {SAVED_MESSAGE}
          </Snackbar>
        </View>
        <View style={styles.footer}>
          {saveError ? (
            <HelperText type="error" visible>
              {saveError}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={submit}
            disabled={isSaving}
            loading={isSaving}
            contentStyle={styles.submitContent}>
            Submit
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
