import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, type TextInput, type View } from 'react-native';

import { EDIT_AFTER_SAVE_GUARD_MS } from '@/constants/limits';
import { useLeaveGuard, type LeaveGuard } from '@/hooks/useLeaveGuard';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { isPickedPhotoUnavailable, useSaveProfileMutation, type PhotoChange } from '@/hooks/useSaveProfileMutation';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import { deletePickedPhotoCache, sweepPickerCache } from '@/services/storage/profilePhotoStorage';
import { bioCounterAccessibilityLabel, bioCounterLabel, clampBio, isBioAtLimit } from '@/utils/profile';

export const SAVED_MESSAGE = 'Profile saved';
export const SAVE_ERROR_MESSAGE = "Couldn't save your profile. Try again.";
export const PICK_ERROR_MESSAGE = "Couldn't open your photos. Try again.";
export const LOAD_ERROR_MESSAGE = "Couldn't load your profile.";
export const PHOTO_UNAVAILABLE_MESSAGE = 'That photo is no longer available. Please pick it again.';
/** Visible label above the bio field and the input's accessible name. */
export const BIO_LABEL = 'Bio';
export const BIO_PLACEHOLDER ='No bio yet. Use Edit profile to add one.';
export const BIO_LIMIT_MESSAGE = 'Character limit reached.';
export const PHOTO_REMOVED_MESSAGE = 'Photo removed';

/**
 * Picker options (SPEC §1.7, Q7): square crop, JPEG quality 0.8.
 * `exif: false` only stops EXIF being returned to JS (`asset.exif`); it does NOT strip metadata
 * from the saved file, which may keep GPS and other tags on iOS and Android. Accepted risk: the
 * copy stays on-device, is excluded from backups (D49) and is never exported (D14, D34).
 * Stripping would need expo-image-manipulator, which the owner ruled out (ADR 011).
 * No permission request: the system photo picker (iOS PHPicker / UIImagePickerController,
 * Android Photo Picker) runs out of process and needs none (ADR 011).
 */
export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  exif: false,
};

export interface ProfileEditState {
  mode: 'view' | 'edit';
  draftBio: string;
  /** Applied only on Save; a picked photo stays at the picker's URI until then. */
  draftPhoto: PhotoChange;
}

export type ProfileEditAction =
  | { type: 'startEdit'; bio: string }
  | { type: 'setBio'; text: string }
  | { type: 'pickPhoto'; uri: string }
  | { type: 'removePhoto' }
  /** The picked file vanished before Save: drop it, keep the bio draft. */
  | { type: 'clearPickedPhoto' }
  /** Cancel, discard on leaving, or a finished save: back to view mode, drafts dropped. */
  | { type: 'exitEdit' };

export const initialProfileEditState: ProfileEditState = {
  mode: 'view',
  draftBio: '',
  draftPhoto: { kind: 'keep' },
};

export function profileEditReducer(state: ProfileEditState, action: ProfileEditAction): ProfileEditState {
  switch (action.type) {
    case 'startEdit':
      // Drafts are seeded once, here; a later refetch never touches them.
      return { mode: 'edit', draftBio: clampBio(action.bio), draftPhoto: { kind: 'keep' } };
    case 'setBio':
      return state.mode === 'edit' ? { ...state, draftBio: clampBio(action.text) } : state;
    case 'pickPhoto':
      return state.mode === 'edit' ? { ...state, draftPhoto: { kind: 'replace', pickerUri: action.uri } } : state;
    case 'removePhoto':
      return state.mode === 'edit' ? { ...state, draftPhoto: { kind: 'remove' } } : state;
    case 'clearPickedPhoto':
      return state.mode === 'edit' && state.draftPhoto.kind === 'replace'
        ? { ...state, draftPhoto: { kind: 'keep' } }
        : state;
    case 'exitEdit':
      return state.mode === 'view' ? state : initialProfileEditState;
  }
}

/** The photo the avatar shows: the draft in edit mode, otherwise the saved one. */
export function shownPhotoUri(state: ProfileEditState, savedPhotoUri: string | null): string | null {
  if (state.mode === 'view') return savedPhotoUri;
  switch (state.draftPhoto.kind) {
    case 'keep':
      return savedPhotoUri;
    case 'replace':
      return state.draftPhoto.pickerUri;
    case 'remove':
      return null;
  }
}

/** True when Save would change something. */
export function hasUnsavedChanges(
  state: ProfileEditState,
  saved: { bio: string; photoUri: string | null },
): boolean {
  if (state.mode !== 'edit') return false;
  if (state.draftBio !== saved.bio) return true;
  if (state.draftPhoto.kind === 'replace') return true;
  return state.draftPhoto.kind === 'remove' && saved.photoUri !== null;
}

/**
 * Profile (SPEC §1.7): view/edit mode, drafts, photo picking, save, Snackbar, scrolling, and
 * the unsaved-changes leave confirmation (Q3). Bio and photo are user data: errors are discarded,
 * never logged or shown.
 */
export function useProfileScreen() {
  const query = useProfileQuery();
  const mutation = useSaveProfileMutation();
  const navigation = useNavigation();
  const scroll = useScrollIntoView();
  const [state, dispatch] = useReducer(profileEditReducer, initialProfileEditState);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [pickError, setPickError] = useState(false);
  const [leaveDialogVisible, setLeaveDialogVisible] = useState(false);
  // `isPending` comes from the render closure; this ref blocks a second tap before re-render.
  const inFlight = useRef(false);
  // Ref for the synchronous re-entry checks; state mirrors it so the header actions, avatar and
  // Remove photo re-render as disabled while the picker is open. On iOS the picker closes before
  // its promise resolves (it still processes the image), so Save/Cancel could otherwise be tapped
  // in that gap and drop the new pick without a message.
  const pickerOpen = useRef(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // False after unmount: a pick that resolves then belongs to no screen, so its file is swept.
  const mounted = useRef(true);
  // Bumped every time edit mode ends (Cancel, Discard, leave, blur, Save). A pick that resolves
  // after its edit session ended belongs to no draft, so its cache file is deleted, not applied.
  const editSession = useRef(0);
  // The navigation to run if the user confirms "Discard".
  const pendingLeave = useRef<(() => void) | null>(null);
  const bioInputRef = useRef<TextInput>(null);
  const bioFieldRef = useRef<View>(null);
  const editButtonRef = useRef<View>(null);
  const avatarButtonRef = useRef<View>(null);
  // Set by Remove photo: the button unmounts, so focus moves to the avatar button after commit.
  const focusAvatarAfterRemove = useRef(false);
  // Where screen-reader focus goes after the next return to view mode, if anywhere. Entering edit
  // mode focuses the bio through its `autoFocus`.
  const focusAfterModeChange = useRef<'editButton' | null>(null);
  // When the last save finished: a double tap on Save must not land on Edit (same spot) and reopen.
  const savedAt = useRef<number | null>(null);

  const saved = { bio: query.data?.bio ?? '', photoUri: query.data?.photoUri ?? null };
  const isEditing = state.mode === 'edit';
  const isDirty = hasUnsavedChanges(state, saved);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const target = focusAfterModeChange.current;
    focusAfterModeChange.current = null;
    if (target === 'editButton' && state.mode === 'view' && editButtonRef.current) {
      AccessibilityInfo.sendAccessibilityEvent(editButtonRef.current, 'focus');
    }
  }, [state.mode]);

  useEffect(() => {
    if (!focusAvatarAfterRemove.current) return;
    focusAvatarAfterRemove.current = false;
    if (avatarButtonRef.current) AccessibilityInfo.sendAccessibilityEvent(avatarButtonRef.current, 'focus');
    // Both platforms (no live region here). Queued so VoiceOver reading the newly focused
    // avatar doesn't cut it off; `queue` is ignored on Android.
    AccessibilityInfo.announceForAccessibilityWithOptions(PHOTO_REMOVED_MESSAGE, { queue: true });
  }, [state.draftPhoto]);

  /** The draft's picked file, if any: a picker cache copy only this screen still points at. */
  const draftPickerUri = state.draftPhoto.kind === 'replace' ? state.draftPhoto.pickerUri : null;

  /**
   * Best-effort sweep of the picker's cache folder, keeping only `keep` (the picked draft still in
   * use). Skipped while the picker is open (it may still be writing); `pickPhoto` sweeps when it
   * resolves instead.
   */
  const releasePickerCache = (keep: string | null) => {
    if (!pickerOpen.current) sweepPickerCache(keep);
  };

  /** Cancel / discard / leave: drops the drafts and the picked photo's cache copy (best-effort). */
  const exitEdit = (returnFocus: boolean) => {
    editSession.current += 1;
    if (draftPickerUri !== null) deletePickedPhotoCache(draftPickerUri);
    releasePickerCache(null);
    focusAfterModeChange.current = returnFocus ? 'editButton' : null;
    setPickError(false);
    mutation.reset();
    dispatch({ type: 'exitEdit' });
  };

  const guard: LeaveGuard = (proceed) => {
    // A save in progress is the user finishing; let them go and let it complete.
    if (state.mode !== 'edit' || inFlight.current) return false;
    if (!isDirty) {
      exitEdit(false);
      return false;
    }
    pendingLeave.current = proceed;
    setLeaveDialogVisible(true);
    return true;
  };
  // Any blur not stopped by the guard (deep link, notification, an unchanged edit) drops the draft.
  useLeaveGuard(guard, () => {
    if (!inFlight.current) {
      pendingLeave.current = null;
      setLeaveDialogVisible(false);
      exitEdit(false);
    }
  });

  const startEdit = () => {
    if (!query.data) return;
    // The second tap of a double tap on Save lands on Edit, which replaces it in the header.
    if (savedAt.current !== null && Date.now() - savedAt.current < EDIT_AFTER_SAVE_GUARD_MS) return;
    setSnackbarVisible(false);
    setPickError(false);
    mutation.reset();
    // No picked draft exists yet: clear leftovers, e.g. from a session the app was killed in.
    releasePickerCache(null);
    dispatch({ type: 'startEdit', bio: query.data.bio });
  };

  const cancel = () => {
    if (inFlight.current || pickerOpen.current) return;
    exitEdit(true);
  };

  const save = async () => {
    if (inFlight.current || pickerOpen.current || state.mode !== 'edit') return;
    inFlight.current = true;
    // A new attempt replaces the previous outcome.
    setSnackbarVisible(false);
    try {
      await mutation.mutateAsync({ bio: state.draftBio, photo: state.draftPhoto });
    } catch (error) {
      // Never logged or shown: it could echo the bio or a file path. Only its kind is used.
      if (isPickedPhotoUnavailable(error)) {
        // Retrying can't succeed with this draft photo; drop it so the avatar stops pointing at it.
        dispatch({ type: 'clearPickedPhoto' });
        releasePickerCache(null);
        AccessibilityInfo.announceForAccessibility(PHOTO_UNAVAILABLE_MESSAGE);
      } else {
        AccessibilityInfo.announceForAccessibility(SAVE_ERROR_MESSAGE);
      }
      return;
    } finally {
      inFlight.current = false;
    }
    savedAt.current = Date.now();
    // saveProfile already swept the picker cache.
    editSession.current += 1;
    // If the user left while saving, don't pull screen-reader focus to a screen they aren't on.
    focusAfterModeChange.current = navigation.isFocused() ? 'editButton' : null;
    setPickError(false);
    dispatch({ type: 'exitEdit' });
    setSnackbarVisible(true);
    // Paper's Snackbar live region is Android-only; queued so VoiceOver doesn't cut it off.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(SAVED_MESSAGE, { queue: true });
    }
  };

  const pickPhoto = async () => {
    if (pickerOpen.current || inFlight.current) return;
    pickerOpen.current = true;
    setIsPickerOpen(true);
    setPickError(false);
    // Blur first: iOS otherwise restores the bio as first responder when the picker closes, and
    // the keyboard rising then can swallow the next tap (e.g. Save).
    bioInputRef.current?.blur();
    const previousPickerUri = draftPickerUri;
    const session = editSession.current;
    // The picked draft to keep when the cache is swept below.
    let keep = previousPickerUri;
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? undefined : result.assets[0];
      if (!mounted.current || editSession.current !== session) {
        // Edit mode ended or the screen unmounted while the picker was open (e.g. a deep link
        // blurred the screen): this pick belongs to no draft. The sweep below deletes it.
        keep = null;
      } else if (asset) {
        // A new photo replaces any earlier save error (e.g. "That photo is no longer available").
        mutation.reset();
        dispatch({ type: 'pickPhoto', uri: asset.uri });
        if (previousPickerUri !== null && previousPickerUri !== asset.uri) deletePickedPhotoCache(previousPickerUri);
        keep = asset.uri;
      }
    } catch {
      // Not shown once edit mode has ended: the error would appear in view mode.
      if (mounted.current && editSession.current === session) {
        setPickError(true);
        AccessibilityInfo.announceForAccessibility(PICK_ERROR_MESSAGE);
      } else {
        keep = null;
      }
    } finally {
      pickerOpen.current = false;
      setIsPickerOpen(false);
      // Also removes Android's pre-crop source copy of this pick (and of a cancelled crop).
      sweepPickerCache(keep);
    }
  };

  const setBio = (text: string) => {
    // Announce once, when the limit is first reached (the message appears without focus moving).
    if (state.mode === 'edit' && !isBioAtLimit(state.draftBio.length) && isBioAtLimit(clampBio(text).length)) {
      AccessibilityInfo.announceForAccessibility(BIO_LIMIT_MESSAGE);
    }
    dispatch({ type: 'setBio', text });
  };

  const removePhoto = () => {
    if (state.mode !== 'edit' || inFlight.current || pickerOpen.current) return;
    focusAvatarAfterRemove.current = true;
    if (draftPickerUri !== null) deletePickedPhotoCache(draftPickerUri);
    releasePickerCache(null);
    dispatch({ type: 'removePhoto' });
  };

  const keepEditing = () => {
    pendingLeave.current = null;
    setLeaveDialogVisible(false);
  };

  const discardAndLeave = () => {
    const proceed = pendingLeave.current;
    pendingLeave.current = null;
    setLeaveDialogVisible(false);
    exitEdit(false);
    proceed?.();
  };

  const photoUri = shownPhotoUri(state, saved.photoUri);
  const bioLength = state.draftBio.length;

  return {
    isEditing,
    isLoading: query.isPending,
    // Only when there is nothing to show: a failed background refetch must not replace the
    // profile (or an open edit form) with the error.
    loadError: query.isError && !query.data ? LOAD_ERROR_MESSAGE : undefined,
    retryLoad: () => void query.refetch(),
    savedBio: saved.bio,
    photoUri,
    draftBio: state.draftBio,
    setBio,
    bioCounter: bioCounterLabel(bioLength),
    bioCounterAccessibilityLabel: bioCounterAccessibilityLabel(bioLength),
    bioAtLimit: isBioAtLimit(bioLength),
    canRemovePhoto: isEditing && photoUri !== null,
    removePhoto,
    pickPhoto,
    pickError: pickError ? PICK_ERROR_MESSAGE : undefined,
    startEdit,
    canStartEdit: query.data !== undefined,
    cancel,
    save,
    isSaving: mutation.isPending,
    /** True while the photo picker is open (until its result is processed): Save, Cancel, the avatar and Remove photo are disabled. */
    isPickerOpen,
    saveError: mutation.isError
      ? isPickedPhotoUnavailable(mutation.error)
        ? PHOTO_UNAVAILABLE_MESSAGE
        : SAVE_ERROR_MESSAGE
      : undefined,
    snackbarVisible,
    dismissSnackbar: () => setSnackbarVisible(false),
    leaveDialogVisible,
    keepEditing,
    discardAndLeave,
    bioInputRef,
    bioFieldRef,
    editButtonRef,
    avatarButtonRef,
    scrollRef: scroll.scrollRef,
    scrollContentRef: scroll.contentRef,
    onScroll: scroll.onScroll,
    onScrollLayout: scroll.onLayout,
    onBioFocus: () => scroll.revealField(bioFieldRef.current),
    onBioBlur: () => scroll.forgetField(bioFieldRef.current),
    // The field grows while typing and the limit message can appear under it: keep it revealed.
    onBioFieldLayout: () => scroll.revealFocusedField(),
  };
}
