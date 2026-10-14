import { act, render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { Directory, File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { BIO_LIMIT } from '@/constants/limits';
import { UNCAPPED_FONT_SCALE } from '@/constants/textScaling';
import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { createLeaveGuardRegistry, LeaveGuardContext } from '@/hooks/useLeaveGuard';
import { useProfileRepository } from '@/hooks/useRepositories';
import { resetFakeNavigation, routerFocus } from '@/tests/helpers/expoRouterFocusMock';
import { fileSystemMock } from '@/tests/helpers/fileSystemMock';
import { makeProviders } from '@/tests/helpers/renderWithProviders';
import { ProfileScreen } from '@/ui/screens/ProfileScreen/ProfileScreen';
import {
  BIO_LIMIT_MESSAGE,
  BIO_PLACEHOLDER,
  LOAD_ERROR_MESSAGE,
  PHOTO_UNAVAILABLE_MESSAGE,
  PICK_ERROR_MESSAGE,
  SAVE_ERROR_MESSAGE,
  SAVED_MESSAGE,
} from '@/ui/screens/ProfileScreen/useProfileScreen';

jest.mock('@/hooks/useRepositories');
jest.mock('expo-router', () => require('@/tests/helpers/expoRouterFocusMock').expoRouterMock());

const fs = fileSystemMock();
const PROFILE_DIR = 'file:///data/document/profile';
const PICKER_DIR = 'file:///data/cache/ImagePicker';
const pickerMock = jest.mocked(ImagePicker.launchImageLibraryAsync);

interface Stored {
  bio: string;
  photo_uri: string | null;
}
let stored: Stored;
let saveProfileImpl: jest.Mock;

type RepoOverrides = { getProfile?: () => Promise<{ id: 1; bio: string; photo_uri: string | null }> };

async function renderProfile(initial: Stored = { bio: '', photo_uri: null }, overrides: RepoOverrides = {}) {
  stored = { ...initial };
  saveProfileImpl = jest.fn(async (patch: Stored) => {
    stored = { ...patch };
  });
  jest.mocked(useProfileRepository).mockReturnValue({
    getProfile: overrides.getProfile ?? (async () => ({ id: 1 as const, ...stored })),
    saveProfile: saveProfileImpl,
    resetProfile: jest.fn(),
  });
  const { queryClient, Wrapper } = makeProviders();
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { gcTime: 0, retry: 0 } });
  const registry = createLeaveGuardRegistry();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(LeaveGuardContext, { value: registry }, createElement(Wrapper, null, children));
  const ui: ReactElement = createElement(ProfileScreen);
  await render(ui, { wrapper });
  const user = userEvent.setup();
  return { user, registry, queryClient };
}

async function loaded(initial?: Stored) {
  const ctx = await renderProfile(initial);
  // The Edit button exists while loading but is disabled until the profile arrives.
  await waitFor(() => expect(screen.getByLabelText('Edit profile').props.accessibilityState?.disabled).toBeFalsy());
  return ctx;
}

async function startEditing(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByLabelText('Edit profile'));
  await screen.findByLabelText('Bio');
}

function pickerAsset(name: string) {
  const uri = `${PICKER_DIR}/${name}`;
  fs.__addFile(uri);
  return { canceled: false as const, assets: [{ uri }] } as never;
}

function ancestorStyles(node: ReturnType<typeof screen.getByText>) {
  const styles: Record<string, unknown>[] = [];
  for (let n: typeof node | null = node; n; n = n.parent) {
    styles.push((StyleSheet.flatten(n.props.style) ?? {}) as Record<string, unknown>);
  }
  return styles;
}

/** Checks a Paper text Button shrinks instead of overflowing: maxWidth, label flexShrink, min height. */
function expectShrinkingButton(name: string) {
  const button = screen.getByRole('button', { name: new RegExp(name) });
  expect(ancestorStyles(button).some((s) => s.maxWidth === '100%')).toBe(true);
  const label = within(button).getByText(name);
  expect(ancestorStyles(label)[0]).toMatchObject({ flexShrink: 1 });
  expect(ancestorStyles(label).some((s) => s.minHeight === MIN_TOUCH_TARGET)).toBe(true);
}

beforeEach(() => {
  fs.__resetFileSystem();
  new Directory(PICKER_DIR).create({ intermediates: true });
  new Directory(PROFILE_DIR).create({ intermediates: true });
  routerFocus.reset();
  resetFakeNavigation();
  pickerMock.mockClear();
  for (const name of ['announceForAccessibility', 'announceForAccessibilityWithOptions', 'sendAccessibilityEvent'] as const) {
    jest.spyOn(AccessibilityInfo, name).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ProfileScreen: loading and errors', () => {
  it('shows a loading indicator while the profile loads', async () => {
    await renderProfile({ bio: '', photo_uri: null }, { getProfile: () => new Promise(() => undefined) });
    expect(screen.getByLabelText('Loading profile')).toBeTruthy();
    expect(screen.getByLabelText('Edit profile').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('shows the load error with an uncapped message and a "Try again" button that refetches', async () => {
    let fail = true;
    const { user } = await renderProfile(
      { bio: 'back again', photo_uri: null },
      {
        getProfile: async () => {
          if (fail) throw new Error('db');
          return { id: 1, ...stored };
        },
      },
    );
    const message = await screen.findByText(LOAD_ERROR_MESSAGE);
    expect(message.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
    expectShrinkingButton('Try again');
    fail = false;
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('back again')).toBeTruthy();
    expect(screen.queryByText(LOAD_ERROR_MESSAGE)).toBeNull();
  });
});

describe('ProfileScreen: view mode', () => {
  it('shows the title, the saved bio and an Edit profile button only', async () => {
    await loaded({ bio: 'I like tea.', photo_uri: null });
    expect(screen.getByRole('header', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByText('I like tea.')).toBeTruthy();
    expect(screen.getByLabelText('Edit profile')).toBeTruthy();
    expect(screen.queryByLabelText('Save profile')).toBeNull();
    expect(screen.queryByLabelText('Cancel editing')).toBeNull();
    expect(screen.queryByLabelText('Bio')).toBeNull();
  });

  it('shows the placeholder for an empty bio', async () => {
    await loaded({ bio: '', photo_uri: null });
    expect(screen.getByText('No bio yet. Use Edit profile to add one.')).toBeTruthy();
    expect(BIO_PLACEHOLDER).toBe('No bio yet. Use Edit profile to add one.');
    expect(StyleSheet.flatten(screen.getByText(BIO_PLACEHOLDER).props.style)).toMatchObject({ fontStyle: 'italic' });
  });

  it('does not style a real bio as the placeholder', async () => {
    await loaded({ bio: 'Real bio', photo_uri: null });
    expect(StyleSheet.flatten(screen.getByText('Real bio').props.style).fontStyle).not.toBe('italic');
  });

  it('shows the saved photo as an image, with no avatar button', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    await loaded({ bio: 'bio', photo_uri: 'photo-a-b.jpg' });
    expect(screen.getByRole('image', { name: 'Profile photo' })).toBeTruthy();
    expect(screen.queryByLabelText('Change profile photo')).toBeNull();
    expect(screen.queryByText('Remove photo')).toBeNull();
  });
});

describe('ProfileScreen: edit mode', () => {
  it('opens the bio field with the saved bio and swaps the header action to Cancel and Save', async () => {
    const { user } = await loaded({ bio: 'saved text', photo_uri: null });
    await startEditing(user);
    expect(screen.getByLabelText('Bio').props.value).toBe('saved text');
    expect(screen.getByLabelText('Cancel editing')).toBeTruthy();
    expect(screen.getByLabelText('Save profile')).toBeTruthy();
    expect(screen.queryByLabelText('Edit profile')).toBeNull();
  });

  it('caps the native input length and leaves text scaling uncapped', async () => {
    const { user } = await loaded();
    await startEditing(user);
    const input = screen.getByLabelText('Bio');
    expect(input.props.maxLength).toBe(BIO_LIMIT);
    expect(input.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
  });

  it('shows a visible "Bio" label hidden from screen readers while the input keeps its accessible name', async () => {
    const { user } = await loaded();
    await startEditing(user);
    const label = screen.getByText('Bio', { includeHiddenElements: true });
    expect(label.props.accessibilityElementsHidden).toBe(true);
    expect(label.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByText('Bio')).toBeNull();
    const input = screen.getByLabelText('Bio');
    expect(input.props.multiline).toBe(true);
    expect(input.props.autoFocus).toBe(true);
    expect(input.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
    expect(input.props.maxLength).toBe(BIO_LIMIT);
  });

  it('does not show the Bio label outside edit mode', async () => {
    await loaded();
    expect(screen.queryByText('Bio', { includeHiddenElements: true })).toBeNull();
  });

  it('shows the counter with an accessibility label, uncapped', async () => {
    const { user } = await loaded({ bio: 'hello', photo_uri: null });
    await startEditing(user);
    const counter = screen.getByLabelText('5 of 1000 characters used');
    expect(counter).toBeTruthy();
    expect(screen.getByText('5 / 1000').props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
    await user.type(screen.getByLabelText('Bio'), '!!');
    expect(screen.getByLabelText('7 of 1000 characters used')).toBeTruthy();
    expect(screen.getByText('7 / 1000')).toBeTruthy();
  });

  it('shows the limit message, uncapped, only at the limit', async () => {
    const { user } = await loaded({ bio: 'a'.repeat(BIO_LIMIT - 1), photo_uri: null });
    await startEditing(user);
    expect(screen.queryByText(BIO_LIMIT_MESSAGE)).toBeNull();
    await user.type(screen.getByLabelText('Bio'), 'b');
    const message = await screen.findByText(BIO_LIMIT_MESSAGE);
    expect(message.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
  });

  it('shows "Add profile photo" without a photo and no Remove photo button', async () => {
    const { user } = await loaded();
    await startEditing(user);
    expect(screen.getByRole('button', { name: 'Add profile photo' })).toBeTruthy();
    expect(screen.queryByText('Remove photo')).toBeNull();
  });

  it('shows "Change profile photo" and a shrinking Remove photo button when a photo shows', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { user } = await loaded({ bio: '', photo_uri: 'photo-a-b.jpg' });
    await startEditing(user);
    expect(screen.getByRole('button', { name: 'Change profile photo' })).toBeTruthy();
    expectShrinkingButton('Remove photo');
  });

  it('Remove photo removes the photo and the button, leaving "Add profile photo"', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { user } = await loaded({ bio: '', photo_uri: 'photo-a-b.jpg' });
    await startEditing(user);
    await user.press(screen.getByRole('button', { name: /Remove photo/ }));
    expect(screen.queryByText('Remove photo')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add profile photo' })).toBeTruthy();
  });

  it('Cancel returns to view mode without saving', async () => {
    const { user } = await loaded({ bio: 'orig', photo_uri: null });
    await startEditing(user);
    await user.clear(screen.getByLabelText('Bio'));
    await user.type(screen.getByLabelText('Bio'), 'changed');
    await user.press(screen.getByLabelText('Cancel editing'));
    expect(screen.getByText('orig')).toBeTruthy();
    expect(saveProfileImpl).not.toHaveBeenCalled();
  });
});

describe('ProfileScreen: picking a photo', () => {
  it('shows the picked photo and then offers Change and Remove', async () => {
    const { user } = await loaded();
    await startEditing(user);
    pickerMock.mockResolvedValueOnce(pickerAsset('picked-1.jpg'));
    await user.press(screen.getByRole('button', { name: 'Add profile photo' }));
    expect(await screen.findByRole('button', { name: 'Change profile photo' })).toBeTruthy();
    expect(screen.getByText('Remove photo')).toBeTruthy();
  });

  it('shows an uncapped error when the picker fails', async () => {
    const { user } = await loaded();
    await startEditing(user);
    pickerMock.mockRejectedValueOnce(new Error('denied'));
    await user.press(screen.getByRole('button', { name: 'Add profile photo' }));
    const error = await screen.findByText(PICK_ERROR_MESSAGE);
    expect(error.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
  });

  it('disables the header actions, the avatar and Remove photo while the picker is open', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { user } = await loaded({ bio: '', photo_uri: 'photo-a-b.jpg' });
    await startEditing(user);
    let release!: (value: never) => void;
    pickerMock.mockImplementationOnce(() => new Promise<never>((r) => (release = r)));
    await user.press(screen.getByRole('button', { name: 'Change profile photo' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Save profile').props.accessibilityState).toMatchObject({ disabled: true }),
    );
    expect(screen.getByLabelText('Cancel editing').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByRole('button', { name: 'Change profile photo' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByRole('button', { name: /Remove photo/ }).props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => {
      release({ canceled: true, assets: null } as never);
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Save profile').props.accessibilityState?.disabled).toBeFalsy(),
    );
  });
});

describe('ProfileScreen: saving', () => {
  it('saves, returns to view mode with the new bio and shows the Snackbar', async () => {
    const { user } = await loaded({ bio: 'old', photo_uri: null });
    await startEditing(user);
    await user.clear(screen.getByLabelText('Bio'));
    await user.type(screen.getByLabelText('Bio'), 'brand new');
    await user.press(screen.getByLabelText('Save profile'));
    expect(await screen.findByText(SAVED_MESSAGE)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('brand new')).toBeTruthy());
    expect(screen.getByLabelText('Edit profile')).toBeTruthy();
    expect(stored.bio).toBe('brand new');
  });

  it('disables the header actions and the bio field while saving', async () => {
    const { user } = await loaded({ bio: 'old', photo_uri: null });
    await startEditing(user);
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    await user.press(screen.getByLabelText('Save profile'));
    await waitFor(() =>
      expect(screen.getByLabelText('Save profile').props.accessibilityState).toMatchObject({ disabled: true }),
    );
    expect(screen.getByLabelText('Cancel editing').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByLabelText('Bio').props.editable).toBe(false);
    await act(async () => release());
    await waitFor(() => expect(screen.getByLabelText('Edit profile')).toBeTruthy());
  });

  it('shows the avatar and Remove photo as disabled while saving', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    const { user } = await loaded({ bio: 'old', photo_uri: 'photo-a-b.jpg' });
    await startEditing(user);
    let release!: () => void;
    saveProfileImpl.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    await user.press(screen.getByLabelText('Save profile'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Change profile photo' }).props.accessibilityState).toMatchObject({
        disabled: true,
      }),
    );
    expect(screen.getByRole('button', { name: /Remove photo/ }).props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => release());
    await waitFor(() => expect(screen.getByLabelText('Edit profile')).toBeTruthy());
  });

  it('shows an uncapped save error and stays in edit mode when saving fails', async () => {
    const { user } = await loaded({ bio: 'old', photo_uri: null });
    await startEditing(user);
    saveProfileImpl.mockRejectedValueOnce(new Error('db'));
    await user.press(screen.getByLabelText('Save profile'));
    const error = await screen.findByText(SAVE_ERROR_MESSAGE);
    expect(error.props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
    expect(screen.getByLabelText('Bio')).toBeTruthy();
    expect(screen.queryByText(SAVED_MESSAGE)).toBeNull();
  });

  it('asks for a new pick when the picked photo vanished before Save', async () => {
    const { user } = await loaded();
    await startEditing(user);
    pickerMock.mockResolvedValueOnce(pickerAsset('vanish-1.jpg'));
    await user.press(screen.getByRole('button', { name: 'Add profile photo' }));
    await screen.findByRole('button', { name: 'Change profile photo' });
    new File(`${PICKER_DIR}/vanish-1.jpg`).delete();
    await user.press(screen.getByLabelText('Save profile'));
    expect(await screen.findByText(PHOTO_UNAVAILABLE_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add profile photo' })).toBeTruthy();
  });
});

describe('ProfileScreen: discard dialog', () => {
  async function openDialog() {
    const ctx = await loaded({ bio: 'orig', photo_uri: null });
    await startEditing(ctx.user);
    await ctx.user.type(screen.getByLabelText('Bio'), ' more');
    const proceed = jest.fn();
    await act(async () => {
      ctx.registry.requestLeave(proceed);
    });
    return { ...ctx, proceed };
  }

  it('shows "Discard changes?" with shrinking Keep editing and Discard buttons', async () => {
    await openDialog();
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(screen.getByText("Your profile changes haven't been saved.")).toBeTruthy();
    expectShrinkingButton('Keep editing');
    expectShrinkingButton('Discard');
  });

  it('Keep editing closes the dialog and keeps the draft', async () => {
    const { user, proceed } = await openDialog();
    await user.press(await screen.findByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByText('Discard changes?')).toBeNull());
    expect(screen.getByLabelText('Bio').props.value).toBe('orig more');
    expect(proceed).not.toHaveBeenCalled();
  });

  it('Discard leaves edit mode and proceeds with the navigation', async () => {
    const { user, proceed } = await openDialog();
    await user.press(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByLabelText('Bio')).toBeNull());
    expect(screen.getByText('orig')).toBeTruthy();
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('is not shown for an untouched edit', async () => {
    const { user, registry } = await loaded({ bio: 'orig', photo_uri: null });
    await startEditing(user);
    await act(async () => {
      expect(registry.requestLeave(jest.fn())).toBe(false);
    });
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});
