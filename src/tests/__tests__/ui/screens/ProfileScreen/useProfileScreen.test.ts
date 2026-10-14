import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Directory, File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { createElement, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { BIO_LIMIT, EDIT_AFTER_SAVE_GUARD_MS } from '@/constants/limits';
import { createLeaveGuardRegistry, LeaveGuardContext } from '@/hooks/useLeaveGuard';
import { useProfileRepository } from '@/hooks/useRepositories';
import type { ProfileRepository } from '@/services/db/profileRepository';
import { fileSystemMock } from '@/tests/helpers/fileSystemMock';
import { fakeNavigation, resetFakeNavigation, routerFocus } from '@/tests/helpers/expoRouterFocusMock';
import { makeProviders } from '@/tests/helpers/renderWithProviders';
import {
  BIO_LIMIT_MESSAGE,
  hasUnsavedChanges,
  initialProfileEditState,
  LOAD_ERROR_MESSAGE,
  PHOTO_REMOVED_MESSAGE,
  PHOTO_UNAVAILABLE_MESSAGE,
  PICK_ERROR_MESSAGE,
  PICKER_OPTIONS,
  profileEditReducer,
  SAVE_ERROR_MESSAGE,
  SAVED_MESSAGE,
  shownPhotoUri,
  useProfileScreen,
  type ProfileEditState,
} from '@/ui/screens/ProfileScreen/useProfileScreen';

jest.mock('@/hooks/useRepositories');
jest.mock('expo-router', () => require('@/tests/helpers/expoRouterFocusMock').expoRouterMock());

const fs = fileSystemMock();
const PROFILE_DIR = 'file:///data/document/profile';
const PICKER_DIR = 'file:///data/cache/ImagePicker';

const edit = (bio: string, draftPhoto: ProfileEditState['draftPhoto'] = { kind: 'keep' }): ProfileEditState => ({
  mode: 'edit',
  draftBio: bio,
  draftPhoto,
});

describe('profileEditReducer', () => {
  it('startEdit seeds the drafts from the saved bio and keeps the photo', () => {
    expect(profileEditReducer(initialProfileEditState, { type: 'startEdit', bio: 'saved' })).toEqual(edit('saved'));
  });

  it('startEdit clamps an over-long saved bio', () => {
    const state = profileEditReducer(initialProfileEditState, { type: 'startEdit', bio: 'a'.repeat(BIO_LIMIT + 5) });
    expect(state.draftBio).toHaveLength(BIO_LIMIT);
  });

  it('startEdit while editing re-seeds (drops earlier drafts)', () => {
    const state = profileEditReducer(edit('draft', { kind: 'remove' }), { type: 'startEdit', bio: 'saved' });
    expect(state).toEqual(edit('saved'));
  });

  it('setBio updates the draft in edit mode, clamped', () => {
    expect(profileEditReducer(edit('a'), { type: 'setBio', text: 'abc' }).draftBio).toBe('abc');
    expect(profileEditReducer(edit(''), { type: 'setBio', text: 'x'.repeat(BIO_LIMIT + 10) }).draftBio).toHaveLength(BIO_LIMIT);
  });

  it('setBio, pickPhoto, removePhoto and clearPickedPhoto leave view mode unchanged', () => {
    const view = initialProfileEditState;
    expect(profileEditReducer(view, { type: 'setBio', text: 'x' })).toBe(view);
    expect(profileEditReducer(view, { type: 'pickPhoto', uri: 'u' })).toBe(view);
    expect(profileEditReducer(view, { type: 'removePhoto' })).toBe(view);
    expect(profileEditReducer(view, { type: 'clearPickedPhoto' })).toBe(view);
  });

  it('pickPhoto replaces the draft photo in edit mode, keeping the bio draft', () => {
    expect(profileEditReducer(edit('bio'), { type: 'pickPhoto', uri: 'file:///x.jpg' })).toEqual(
      edit('bio', { kind: 'replace', pickerUri: 'file:///x.jpg' }),
    );
  });

  it('removePhoto marks the photo for removal in edit mode', () => {
    expect(profileEditReducer(edit('bio'), { type: 'removePhoto' })).toEqual(edit('bio', { kind: 'remove' }));
  });

  it('clearPickedPhoto drops a picked photo only', () => {
    const picked = edit('bio', { kind: 'replace', pickerUri: 'u' });
    expect(profileEditReducer(picked, { type: 'clearPickedPhoto' })).toEqual(edit('bio'));
    const removed = edit('bio', { kind: 'remove' });
    expect(profileEditReducer(removed, { type: 'clearPickedPhoto' })).toBe(removed);
    const kept = edit('bio');
    expect(profileEditReducer(kept, { type: 'clearPickedPhoto' })).toBe(kept);
  });

  it('exitEdit returns to the initial view state from edit mode', () => {
    expect(profileEditReducer(edit('x', { kind: 'remove' }), { type: 'exitEdit' })).toBe(initialProfileEditState);
  });

  it('exitEdit in view mode returns the same state', () => {
    const view = initialProfileEditState;
    expect(profileEditReducer(view, { type: 'exitEdit' })).toBe(view);
  });
});

describe('shownPhotoUri', () => {
  it('shows the saved photo in view mode', () => {
    expect(shownPhotoUri(initialProfileEditState, 'saved.jpg')).toBe('saved.jpg');
    expect(shownPhotoUri(initialProfileEditState, null)).toBeNull();
  });

  it('in edit mode: keep shows the saved photo, replace the picked one, remove none', () => {
    expect(shownPhotoUri(edit('', { kind: 'keep' }), 'saved.jpg')).toBe('saved.jpg');
    expect(shownPhotoUri(edit('', { kind: 'replace', pickerUri: 'picked.jpg' }), 'saved.jpg')).toBe('picked.jpg');
    expect(shownPhotoUri(edit('', { kind: 'remove' }), 'saved.jpg')).toBeNull();
  });
});

describe('hasUnsavedChanges', () => {
  const saved = { bio: 'bio', photoUri: 'photo.jpg' as string | null };

  it('is false in view mode, even with leftover drafts', () => {
    expect(hasUnsavedChanges({ mode: 'view', draftBio: 'changed', draftPhoto: { kind: 'remove' } }, saved)).toBe(false);
  });

  it('is false for an untouched edit', () => {
    expect(hasUnsavedChanges(edit('bio'), saved)).toBe(false);
  });

  it('is true when the bio differs', () => {
    expect(hasUnsavedChanges(edit('bio!'), saved)).toBe(true);
  });

  it('is true for a picked photo', () => {
    expect(hasUnsavedChanges(edit('bio', { kind: 'replace', pickerUri: 'u' }), saved)).toBe(true);
  });

  it('is true when removing an existing photo, false when there is none to remove', () => {
    expect(hasUnsavedChanges(edit('bio', { kind: 'remove' }), saved)).toBe(true);
    expect(hasUnsavedChanges(edit('bio', { kind: 'remove' }), { bio: 'bio', photoUri: null })).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Hook behaviour
// ---------------------------------------------------------------------------------------------

interface Stored {
  bio: string;
  photo_uri: string | null;
}

let stored: Stored;
let getProfile: jest.Mock;
let saveProfileImpl: jest.Mock;
let announce: jest.SpyInstance;
let announceQueued: jest.SpyInstance;
let sendEvent: jest.SpyInstance;
const pickerMock = jest.mocked(ImagePicker.launchImageLibraryAsync);

function pickerAsset(name: string) {
  const uri = `${PICKER_DIR}/${name}`;
  fs.__addFile(uri);
  return { canceled: false as const, assets: [{ uri }] } as never;
}

/** A picker call that resolves when the test says so. */
function deferredPicker() {
  let resolve!: (value: never) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<never>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  pickerMock.mockImplementationOnce(() => promise);
  return { resolve, reject };
}

function pickerFiles() {
  return fs.__listFiles().filter((f) => f.startsWith(PICKER_DIR));
}

async function setup(initial: Stored = { bio: 'saved bio', photo_uri: null }) {
  stored = { ...initial };
  getProfile = jest.fn(async () => ({ id: 1 as const, ...stored }));
  saveProfileImpl = jest.fn(async (patch: Stored) => {
    stored = { ...patch };
  });
  const repo: ProfileRepository = { getProfile, saveProfile: saveProfileImpl, resetProfile: jest.fn() };
  jest.mocked(useProfileRepository).mockReturnValue(repo);

  const { queryClient, Wrapper } = makeProviders();
  queryClient.setDefaultOptions({ ...queryClient.getDefaultOptions(), queries: { retry: false } });
  const registry = createLeaveGuardRegistry();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(LeaveGuardContext, { value: registry }, createElement(Wrapper, null, children));
  const hook = await renderHook(() => useProfileScreen(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return { ...hook, registry, queryClient };
}

/** Runs `fn` inside act and flushes the promises it started. */
async function run(fn: () => unknown) {
  await act(async () => {
    await fn();
  });
}

beforeEach(() => {
  fs.__resetFileSystem();
  new Directory(PICKER_DIR).create({ intermediates: true });
  new Directory(PROFILE_DIR).create({ intermediates: true });
  routerFocus.reset();
  resetFakeNavigation();
  pickerMock.mockClear();
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  announceQueued = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => undefined);
  sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
  // RN's jest setup already makes these mock functions, so spyOn returns the shared one: reset its calls.
  for (const spy of [announce, announceQueued, sendEvent]) spy.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useProfileScreen: loading', () => {
  it('exposes the saved bio and a resolved photo URI', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { result } = await setup({ bio: 'hello', photo_uri: 'photo-a-b.jpg' });
    expect(result.current.savedBio).toBe('hello');
    expect(result.current.photoUri).toBe(`${PROFILE_DIR}/photo-a-b.jpg`);
    expect(result.current.canStartEdit).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.loadError).toBeUndefined();
  });

  it('is loading, with Edit unavailable, until the profile arrives', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    stored = { bio: 'late', photo_uri: null };
    jest.mocked(useProfileRepository).mockReturnValue({
      getProfile: async () => {
        await gate;
        return { id: 1, ...stored };
      },
      saveProfile: jest.fn(),
      resetProfile: jest.fn(),
    });
    const { Wrapper } = makeProviders();
    const { result } = await renderHook(() => useProfileScreen(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.canStartEdit).toBe(false);
    await run(() => result.current.startEdit());
    expect(result.current.isEditing).toBe(false);
    await run(() => release());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedBio).toBe('late');
  });

  it('shows the load error, and retryLoad refetches, when nothing could be loaded', async () => {
    stored = { bio: 'ok', photo_uri: null };
    let fail = true;
    jest.mocked(useProfileRepository).mockReturnValue({
      getProfile: async () => {
        if (fail) throw new Error('db down');
        return { id: 1, ...stored };
      },
      saveProfile: jest.fn(),
      resetProfile: jest.fn(),
    });
    const { queryClient, Wrapper } = makeProviders();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const { result } = await renderHook(() => useProfileScreen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loadError).toBe(LOAD_ERROR_MESSAGE));
    expect(result.current.canStartEdit).toBe(false);
    fail = false;
    await run(() => result.current.retryLoad());
    await waitFor(() => expect(result.current.savedBio).toBe('ok'));
    expect(result.current.loadError).toBeUndefined();
  });

  it('keeps the profile (no load error) when a background refetch fails', async () => {
    const { result, queryClient } = await setup();
    getProfile.mockRejectedValueOnce(new Error('transient'));
    await run(() => queryClient.refetchQueries({ queryKey: ['profile'] }));
    expect(result.current.loadError).toBeUndefined();
    expect(result.current.savedBio).toBe('saved bio');
  });
});

describe('useProfileScreen: startEdit / cancel', () => {
  it('startEdit seeds the draft bio from the saved bio', async () => {
    const { result } = await setup({ bio: 'saved bio', photo_uri: null });
    await run(() => result.current.startEdit());
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draftBio).toBe('saved bio');
    expect(result.current.bioCounter).toBe('9 / 1000');
    expect(result.current.bioCounterAccessibilityLabel).toBe('9 of 1000 characters used');
  });

  it('cancel drops the drafts and returns to view mode with focus on the Edit button', async () => {
    const { result } = await setup();
    const editButton = {};
    (result.current.editButtonRef as { current: unknown }).current = editButton;
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('changed'));
    await run(() => result.current.cancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.savedBio).toBe('saved bio');
    expect(sendEvent).toHaveBeenCalledWith(editButton, 'focus');
  });

  it('cancel deletes the picked photo cache file and sweeps the picker cache', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    fs.__addFile(`${PICKER_DIR}/precrop-2.jpg`);
    await run(() => result.current.pickPhoto());
    await run(() => result.current.cancel());
    expect(pickerFiles()).toEqual([]);
  });

  it('exposes the unused handlers without throwing', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    expect(() => {
      result.current.onBioFocus();
      result.current.onBioBlur();
      result.current.onBioFieldLayout();
    }).not.toThrow();
  });

  describe('after a save', () => {
    beforeEach(() => {
      // Only Date is faked: query and promise timing stay real.
      jest.useFakeTimers({
        now: new Date('2026-10-14T10:00:00Z'),
        doNotFake: [
          'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
          'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
          'setTimeout', 'clearTimeout',
        ],
      });
    });

    it('ignores Edit within EDIT_AFTER_SAVE_GUARD_MS of a save and allows it afterwards', async () => {
      const { result } = await setup();
      await run(() => result.current.startEdit());
      await run(() => result.current.setBio('new'));
      await run(() => result.current.save());
      expect(result.current.isEditing).toBe(false);

      jest.setSystemTime(Date.now() + EDIT_AFTER_SAVE_GUARD_MS - 1);
      await run(() => result.current.startEdit());
      expect(result.current.isEditing).toBe(false);

      jest.setSystemTime(Date.now() + 1);
      await run(() => result.current.startEdit());
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draftBio).toBe('new');
    });
  });

  it('startEdit hides the previous Snackbar and error', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.save());
    expect(result.current.snackbarVisible).toBe(true);
    jest.useFakeTimers({ now: Date.now() + EDIT_AFTER_SAVE_GUARD_MS + 5, doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'nextTick', 'queueMicrotask', 'hrtime', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback'] });
    await run(() => result.current.startEdit());
    expect(result.current.snackbarVisible).toBe(false);
  });
});

describe('useProfileScreen: bio', () => {
  it('announces the limit once when first reached, not again at the limit, and again after dropping below', async () => {
    const { result } = await setup({ bio: '', photo_uri: null });
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT - 1)));
    expect(announce).not.toHaveBeenCalled();
    expect(result.current.bioAtLimit).toBe(false);

    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT)));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(BIO_LIMIT_MESSAGE);
    expect(result.current.bioAtLimit).toBe(true);

    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT)));
    expect(announce).toHaveBeenCalledTimes(1);

    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT - 1)));
    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT)));
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('clamps a paste over the limit and announces', async () => {
    const { result } = await setup({ bio: '', photo_uri: null });
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('x'.repeat(BIO_LIMIT + 300)));
    expect(result.current.draftBio).toHaveLength(BIO_LIMIT);
    expect(announce).toHaveBeenCalledWith(BIO_LIMIT_MESSAGE);
  });

  it('does not announce, or change anything, in view mode', async () => {
    const { result } = await setup({ bio: '', photo_uri: null });
    await run(() => result.current.setBio('a'.repeat(BIO_LIMIT)));
    expect(announce).not.toHaveBeenCalled();
    expect(result.current.draftBio).toBe('');
  });
});

describe('useProfileScreen: pickPhoto', () => {
  it('uses the square, JPEG 0.8, no-EXIF picker options', () => {
    expect(PICKER_OPTIONS).toEqual({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false });
  });

  it('applies the picked photo as the draft, sweeps other picker files and keeps the new one', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    fs.__addFile(`${PICKER_DIR}/precrop-9.jpg`);
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    await run(() => result.current.pickPhoto());
    expect(pickerMock).toHaveBeenCalledWith(PICKER_OPTIONS);
    expect(result.current.photoUri).toBe(`${PICKER_DIR}/picked-1.jpg`);
    expect(pickerFiles()).toEqual([`${PICKER_DIR}/picked-1.jpg`]);
    expect(result.current.isPickerOpen).toBe(false);
    expect(result.current.canRemovePhoto).toBe(true);
  });

  it('blurs the bio field before opening the picker', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    const blur = jest.fn();
    (result.current.bioInputRef as { current: unknown }).current = { blur };
    await run(() => result.current.pickPhoto());
    expect(blur).toHaveBeenCalledTimes(1);
  });

  it('deletes the previous picked draft file when picking another', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockResolvedValueOnce(pickerAsset('first-1.jpg'));
    await run(() => result.current.pickPhoto());
    pickerMock.mockResolvedValueOnce(pickerAsset('second-2.jpg'));
    await run(() => result.current.pickPhoto());
    expect(result.current.photoUri).toBe(`${PICKER_DIR}/second-2.jpg`);
    expect(pickerFiles()).toEqual([`${PICKER_DIR}/second-2.jpg`]);
  });

  it('clears an earlier save error when a new photo is picked', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    saveProfileImpl.mockRejectedValueOnce(new Error('x'));
    await run(() => result.current.save());
    expect(result.current.saveError).toBe(SAVE_ERROR_MESSAGE);
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    await run(() => result.current.pickPhoto());
    expect(result.current.saveError).toBeUndefined();
  });

  it('keeps the current draft when the user cancels the picker', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockResolvedValueOnce(pickerAsset('first-1.jpg'));
    await run(() => result.current.pickPhoto());
    pickerMock.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await run(() => result.current.pickPhoto());
    expect(result.current.photoUri).toBe(`${PICKER_DIR}/first-1.jpg`);
    expect(pickerFiles()).toEqual([`${PICKER_DIR}/first-1.jpg`]);
    expect(result.current.pickError).toBeUndefined();
  });

  it('shows and announces an error when the picker throws', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockRejectedValueOnce(new Error('denied'));
    await run(() => result.current.pickPhoto());
    expect(result.current.pickError).toBe(PICK_ERROR_MESSAGE);
    expect(announce).toHaveBeenCalledWith(PICK_ERROR_MESSAGE);
    expect(result.current.isPickerOpen).toBe(false);
  });

  it('clears the pick error on the next attempt', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockRejectedValueOnce(new Error('denied'));
    await run(() => result.current.pickPhoto());
    pickerMock.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await run(() => result.current.pickPhoto());
    expect(result.current.pickError).toBeUndefined();
  });

  it('ignores a second pickPhoto while the picker is open', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    const picker = deferredPicker();
    let first!: Promise<void>;
    await act(async () => {
      first = result.current.pickPhoto();
    });
    await run(() => result.current.pickPhoto());
    expect(pickerMock).toHaveBeenCalledTimes(1);
    await run(async () => {
      picker.resolve({ canceled: true, assets: null } as never);
      await first;
    });
  });

  it('while the picker is open: isPickerOpen is true and save, cancel and removePhoto do nothing', async () => {
    const { result } = await setup({ bio: 'bio', photo_uri: null });
    await run(() => result.current.startEdit());
    const picker = deferredPicker();
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.pickPhoto();
    });
    expect(result.current.isPickerOpen).toBe(true);
    await run(() => result.current.save());
    await run(() => result.current.cancel());
    await run(() => result.current.removePhoto());
    expect(saveProfileImpl).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
    expect(result.current.photoUri).toBeNull();
    await run(async () => {
      picker.resolve(pickerAsset('late-1.jpg'));
      await pending;
    });
    expect(result.current.isPickerOpen).toBe(false);
    expect(result.current.photoUri).toBe(`${PICKER_DIR}/late-1.jpg`);
  });

  it('does not open the picker while a save is in flight', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    let saving!: Promise<void>;
    await act(async () => {
      saving = result.current.save();
    });
    await run(() => result.current.pickPhoto());
    expect(pickerMock).not.toHaveBeenCalled();
    await run(async () => {
      release();
      await saving;
    });
  });

  it('a pick that resolves after unmount is not applied and its file is swept', async () => {
    const { result, unmount } = await setup();
    await run(() => result.current.startEdit());
    const picker = deferredPicker();
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.pickPhoto();
    });
    await unmount();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    picker.resolve(pickerAsset('orphan-1.jpg'));
    await pending;
    expect(pickerFiles()).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('a pick that resolves after edit mode ended by a blur is not applied and its file is swept', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    const picker = deferredPicker();
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.pickPhoto();
    });
    await act(async () => routerFocus.set(false));
    expect(result.current.isEditing).toBe(false);
    await run(async () => {
      picker.resolve(pickerAsset('stale-1.jpg'));
      await pending;
    });
    expect(result.current.isEditing).toBe(false);
    expect(result.current.photoUri).toBeNull();
    expect(pickerFiles()).toEqual([]);
  });

  it('a picker failure after edit mode ended shows no error and sweeps', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    const picker = deferredPicker();
    fs.__addFile(`${PICKER_DIR}/leftover-1.jpg`);
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.pickPhoto();
    });
    await act(async () => routerFocus.set(false));
    await run(async () => {
      picker.reject(new Error('boom'));
      await pending;
    });
    expect(result.current.pickError).toBeUndefined();
    expect(announce).not.toHaveBeenCalledWith(PICK_ERROR_MESSAGE);
    expect(pickerFiles()).toEqual([]);
  });
});

describe('useProfileScreen: save', () => {
  it('writes the drafts, exits edit mode, shows the Snackbar and announces on iOS (queued)', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('edited'));
    await run(() => result.current.save());
    expect(stored.bio).toBe('edited');
    expect(result.current.isEditing).toBe(false);
    await waitFor(() => expect(result.current.savedBio).toBe('edited'));
    expect(result.current.snackbarVisible).toBe(true);
    expect(announceQueued).toHaveBeenCalledWith(SAVED_MESSAGE, { queue: true });
    expect(result.current.saveError).toBeUndefined();
  });

  it('does not announce the saved message on Android (Snackbar live region does)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.save());
    expect(result.current.snackbarVisible).toBe(true);
    expect(announceQueued).not.toHaveBeenCalled();
  });

  it('moves screen-reader focus to the Edit button when the screen is focused', async () => {
    const { result } = await setup();
    const editButton = {};
    (result.current.editButtonRef as { current: unknown }).current = editButton;
    await run(() => result.current.startEdit());
    await run(() => result.current.save());
    expect(sendEvent).toHaveBeenCalledWith(editButton, 'focus');
  });

  it('does not move focus when the user already left the screen', async () => {
    const { result } = await setup();
    (result.current.editButtonRef as { current: unknown }).current = {};
    await run(() => result.current.startEdit());
    fakeNavigation.isFocused.mockReturnValue(false);
    await run(() => result.current.save());
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('dismissSnackbar hides the Snackbar', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.save());
    await run(() => result.current.dismissSnackbar());
    expect(result.current.snackbarVisible).toBe(false);
  });

  it('keeps the draft and announces a generic error on iOS and Android when saving fails', async () => {
    for (const os of ['ios', 'android'] as const) {
      announce.mockClear();
      const spy = jest.replaceProperty(Platform, 'OS', os);
      const { result, unmount } = await setup();
      await run(() => result.current.startEdit());
      await run(() => result.current.setBio('my draft'));
      saveProfileImpl.mockRejectedValueOnce(new Error('db'));
      await run(() => result.current.save());
      expect(result.current.saveError).toBe(SAVE_ERROR_MESSAGE);
      expect(announce).toHaveBeenCalledWith(SAVE_ERROR_MESSAGE);
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draftBio).toBe('my draft');
      expect(result.current.snackbarVisible).toBe(false);
      spy.restore();
      await unmount();
    }
  });

  it('a retry after a failure succeeds and clears the error', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    saveProfileImpl.mockRejectedValueOnce(new Error('db'));
    await run(() => result.current.save());
    await run(() => result.current.save());
    expect(result.current.saveError).toBeUndefined();
    expect(result.current.isEditing).toBe(false);
  });

  it('drops a vanished picked photo, sweeps, and shows and announces "no longer available"', async () => {
    const { result } = await setup({ bio: 'bio', photo_uri: null });
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('typed bio'));
    pickerMock.mockResolvedValueOnce(pickerAsset('vanish-1.jpg'));
    await run(() => result.current.pickPhoto());
    fs.__addFile(`${PICKER_DIR}/other-2.jpg`);
    // The OS purged the picked file between Pick and Save.
    new File(`${PICKER_DIR}/vanish-1.jpg`).delete();

    await run(() => result.current.save());
    expect(result.current.saveError).toBe(PHOTO_UNAVAILABLE_MESSAGE);
    expect(announce).toHaveBeenCalledWith(PHOTO_UNAVAILABLE_MESSAGE);
    expect(result.current.photoUri).toBeNull();
    expect(result.current.draftBio).toBe('typed bio');
    expect(result.current.isEditing).toBe(true);
    expect(saveProfileImpl).not.toHaveBeenCalled();
    expect(pickerFiles()).toEqual([]);
  });

  it('a double tap on Save writes once', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(async () => {
      const save = result.current.save;
      await Promise.all([save(), save()]);
    });
    expect(saveProfileImpl).toHaveBeenCalledTimes(1);
  });

  it('save does nothing in view mode', async () => {
    const { result } = await setup();
    await run(() => result.current.save());
    expect(saveProfileImpl).not.toHaveBeenCalled();
  });

  it('isSaving is true while the mutation runs', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    let saving!: Promise<void>;
    await act(async () => {
      saving = result.current.save();
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));
    await run(async () => {
      release();
      await saving;
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('saves a replaced photo into the profile folder and shows it afterwards', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockResolvedValueOnce(pickerAsset('new-1.png'));
    await run(() => result.current.pickPhoto());
    await run(() => result.current.save());
    expect(stored.photo_uri).toMatch(/^photo-.+\.png$/);
    await waitFor(() => expect(result.current.photoUri).toBe(`${PROFILE_DIR}/${stored.photo_uri}`));
    expect(pickerFiles()).toEqual([]);
  });
});

describe('useProfileScreen: removePhoto', () => {
  it('shows no photo, deletes the picked draft file, sweeps, focuses the avatar and announces (queued)', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { result } = await setup({ bio: 'bio', photo_uri: 'photo-a-b.jpg' });
    const avatar = {};
    (result.current.avatarButtonRef as { current: unknown }).current = avatar;
    await run(() => result.current.startEdit());
    expect(result.current.canRemovePhoto).toBe(true);
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    fs.__addFile(`${PICKER_DIR}/extra-2.jpg`);
    await run(() => result.current.pickPhoto());
    await run(() => result.current.removePhoto());
    expect(result.current.photoUri).toBeNull();
    expect(result.current.canRemovePhoto).toBe(false);
    expect(pickerFiles()).toEqual([]);
    expect(sendEvent).toHaveBeenCalledWith(avatar, 'focus');
    expect(announceQueued).toHaveBeenCalledWith(PHOTO_REMOVED_MESSAGE, { queue: true });
  });

  it('is unavailable with no photo, and does nothing in view mode', async () => {
    const { result } = await setup();
    await run(() => result.current.removePhoto());
    expect(announceQueued).not.toHaveBeenCalled();
    await run(() => result.current.startEdit());
    expect(result.current.canRemovePhoto).toBe(false);
  });

  it('is ignored while a save is in flight', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { result } = await setup({ bio: 'bio', photo_uri: 'photo-a-b.jpg' });
    await run(() => result.current.startEdit());
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    let saving!: Promise<void>;
    await act(async () => {
      saving = result.current.save();
    });
    await run(() => result.current.removePhoto());
    expect(result.current.photoUri).not.toBeNull();
    await run(async () => {
      release();
      await saving;
    });
  });
});

describe('useProfileScreen: leave guard', () => {
  it('does not block when not editing', async () => {
    const { registry } = await setup();
    const proceed = jest.fn();
    expect(registry.requestLeave(proceed)).toBe(false);
    expect(proceed).not.toHaveBeenCalled();
  });

  it('lets an unchanged edit go, and exits edit mode', async () => {
    const { result, registry } = await setup();
    await run(() => result.current.startEdit());
    let blocked: boolean | undefined;
    await run(() => {
      blocked = registry.requestLeave(jest.fn());
    });
    expect(blocked).toBe(false);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.leaveDialogVisible).toBe(false);
  });

  it('lets the user go while a save is in flight and does not exit edit mode itself', async () => {
    const { result, registry } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('dirty'));
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    let saving!: Promise<void>;
    await act(async () => {
      saving = result.current.save();
    });
    let blocked: boolean | undefined;
    await run(() => {
      blocked = registry.requestLeave(jest.fn());
    });
    expect(blocked).toBe(false);
    expect(result.current.leaveDialogVisible).toBe(false);
    await run(async () => {
      release();
      await saving;
    });
  });

  it('asks before discarding a dirty draft; Keep editing stays and does not proceed', async () => {
    const { result, registry } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('dirty'));
    const proceed = jest.fn();
    let blocked: boolean | undefined;
    await run(() => {
      blocked = registry.requestLeave(proceed);
    });
    expect(blocked).toBe(true);
    expect(result.current.leaveDialogVisible).toBe(true);
    await run(() => result.current.keepEditing());
    expect(result.current.leaveDialogVisible).toBe(false);
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draftBio).toBe('dirty');
    expect(proceed).not.toHaveBeenCalled();
  });

  it('Discard exits edit mode, deletes the picked file and proceeds', async () => {
    const { result, registry } = await setup();
    await run(() => result.current.startEdit());
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    await run(() => result.current.pickPhoto());
    const proceed = jest.fn();
    await run(() => {
      registry.requestLeave(proceed);
    });
    await run(() => result.current.discardAndLeave());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.leaveDialogVisible).toBe(false);
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(pickerFiles()).toEqual([]);
  });

  it('Discard with nothing pending does not throw', async () => {
    const { result } = await setup();
    await run(() => result.current.discardAndLeave());
    expect(result.current.isEditing).toBe(false);
  });

  it('any other blur drops the draft and closes the dialog', async () => {
    const { result, registry } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('dirty'));
    await run(() => {
      registry.requestLeave(jest.fn());
    });
    expect(result.current.leaveDialogVisible).toBe(true);
    await act(async () => routerFocus.set(false));
    expect(result.current.isEditing).toBe(false);
    expect(result.current.leaveDialogVisible).toBe(false);
  });

  it('a blur during a save keeps the screen state (the save finishes it)', async () => {
    const { result } = await setup();
    await run(() => result.current.startEdit());
    await run(() => result.current.setBio('dirty'));
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    let saving!: Promise<void>;
    await act(async () => {
      saving = result.current.save();
    });
    await act(async () => routerFocus.set(false));
    expect(result.current.isEditing).toBe(true);
    await run(async () => {
      release();
      await saving;
    });
    expect(result.current.isEditing).toBe(false);
  });
});
