import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Dimensions, StyleSheet } from 'react-native';

import { queryClient } from '@/ui/components/AppProviders/useAppProviders';
import { migrateDbIfNeeded } from '@/services/db/migrations';
import { storage } from '@/services/storage/mmkv';
import { NodeSqliteAdapter } from '@/tests/helpers/nodeSqliteAdapter';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

// The real route tree (src/app) with real providers, except SQLite (native) and the splash.
// `mockDb` is swapped for a real in-memory database by the Profile tests; elsewhere the screens
// never touch the database.
let mockDb: unknown = {};
jest.mock('expo-sqlite', () => ({
  SQLiteProvider: ({ children }: { children: React.ReactNode }) => children,
  useSQLiteContext: () => mockDb,
}));
jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => true),
}));

/**
 * expo-router 57.0.25's renderRouter does Object.assign(render(...), { getPathname, ... }), but
 * RNTL 14's render() returns a Promise, so the helpers live on the returned Promise object.
 * Keep that object, await it separately, and expose getPathname through a plain wrapper (an
 * async function returning the thenable itself would unwrap it again).
 */
async function renderApp(initialUrl: string) {
  const result = renderRouter('src/app', { initialUrl });
  await result;
  // Wait for AppReadyGate (bootstrap) to render the navigator.
  await waitFor(() => expect(screen.getByTestId('app-ready-root')).toBeTruthy());
  return { getPathname: () => result.getPathname(), getRouterState: () => result.getRouterState() as NavState };
}

type NavState = { type?: string; history?: unknown[]; routes?: { state?: NavState }[] } | undefined;

/** Depth-first search for the first navigator state of a given type. */
function findNavigatorState(state: NavState, type: string): NavState {
  if (!state) return undefined;
  if (state.type === type) return state;
  for (const route of state.routes ?? []) {
    const found = findNavigatorState(route.state, type);
    if (found) return found;
  }
  return undefined;
}

/** Tab bar buttons (role "button" on iOS, "tab" elsewhere) are labelled "{Title}, tab, n of m". */
const TAB_BUTTON_LABEL = /^(.+), tab, \d+ of \d+$/;

function tabButtons() {
  return [...screen.queryAllByRole('button'), ...screen.queryAllByRole('tab')].filter((el) =>
    TAB_BUTTON_LABEL.test(String(el.props.accessibilityLabel ?? '')),
  );
}

/**
 * The tab bar renders each icon twice (focused true/false) and cross-fades by opacity, but only the
 * visible layer renders an icon, so exactly one variant exists per tab.
 */
function shownIconVariant(tab: 'home' | 'dashboard'): 'filled' | 'outline' {
  const filled = screen.queryByTestId(`tab-icon-${tab}-filled`);
  const outline = screen.queryByTestId(`tab-icon-${tab}-outline`);
  expect([filled, outline].filter(Boolean)).toHaveLength(1);
  return filled ? 'filled' : 'outline';
}

function visibleTabNames() {
  return tabButtons().map((t) => TAB_BUTTON_LABEL.exec(String(t.props.accessibilityLabel))?.[1]);
}

beforeEach(() => {
  mockDb = {};
  storage.clearAll();
  secureStoreMock().__resetSecureStore();
});

describe('navigation shell (D35)', () => {
  it('opens on Home with a labelled menu button', async () => {
    const app = await renderApp('/');
    expect(app.getPathname()).toBe('/');
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('shows only Home and Dashboard in the tab bar', async () => {
    await renderApp('/');
    expect(visibleTabNames()).toEqual(['Home', 'Dashboard']);
  });

  it('labels the visible tabs by their position among visible tabs only (iOS wording)', async () => {
    await renderApp('/');
    expect(tabButtons().map((t) => t.props.accessibilityLabel)).toEqual(['Home, tab, 1 of 2', 'Dashboard, tab, 2 of 2']);
  });

  it('shows the selected tab with a filled icon and the others with an outline icon (not colour alone)', async () => {
    const app = await renderApp('/');
    expect(shownIconVariant('home')).toBe('filled');
    expect(shownIconVariant('dashboard')).toBe('outline');
    const { router } = jest.requireActual<typeof import('expo-router')>('expo-router');
    await act(() => router.navigate('/dashboard'));
    expect(app.getPathname()).toBe('/dashboard');
    expect(shownIconVariant('home')).toBe('outline');
    expect(shownIconVariant('dashboard')).toBe('filled');
  });

  it.each(['/diary', '/profile', '/settings'])('%s renders as a hidden tab with no tab button of its own', async (path) => {
    const app = await renderApp(path);
    expect(app.getPathname()).toBe(path);
    const title = path.slice(1, 2).toUpperCase() + path.slice(2);
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(visibleTabNames()).toEqual(['Home', 'Dashboard']);
    for (const tab of tabButtons()) {
      expect(tab).not.toBeSelected();
    }
  });

  it('renders /chat as a root stack screen with a back button and no tab bar', async () => {
    const app = await renderApp('/chat');
    expect(app.getPathname()).toBe('/chat');
    expect(screen.getByLabelText('Go back')).toBeTruthy();
    expect(tabButtons()).toEqual([]);
  });

  it('keeps the drawer beneath /chat (anchor), so back returns to Home', async () => {
    const app = await renderApp('/chat');
    const { router } = jest.requireActual<typeof import('expo-router')>('expo-router');
    expect(router.canGoBack()).toBe(true);
    await act(() => router.back());
    expect(app.getPathname()).toBe('/');
  });

  it('navigates between hidden tabs from code', async () => {
    const app = await renderApp('/');
    const { router } = jest.requireActual<typeof import('expo-router')>('expo-router');
    await act(() => router.navigate('/settings'));
    expect(app.getPathname()).toBe('/settings');
    await act(() => router.navigate('/dashboard'));
    expect(app.getPathname()).toBe('/dashboard');
  });

  it('opens the drawer from the header menu button inside the tabs', async () => {
    const app = await renderApp('/');
    await fireEvent.press(screen.getByLabelText('Open menu'));
    // The action bubbles from the tab screen to the Drawer, which records an open-drawer entry.
    const drawer = findNavigatorState(app.getRouterState(), 'drawer');
    expect(drawer).toBeDefined();
    expect(JSON.stringify(drawer?.history)).toContain('"type":"drawer"');
  });

  it('Chat header back button returns to Home', async () => {
    const app = await renderApp('/chat');
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(app.getPathname()).toBe('/');
  });
});

describe('Profile route and the unsaved-changes leave guard', () => {
  let db: NodeSqliteAdapter;

  beforeEach(async () => {
    db = new NodeSqliteAdapter();
    await migrateDbIfNeeded(db);
    await db.runAsync('UPDATE profile SET bio = ? WHERE id = 1', 'Saved bio');
    mockDb = db;
    // The app's QueryClient lives at module scope: drop what earlier tests cached (e.g. the profile
    // query that failed against the empty stand-in database).
    queryClient.clear();
  });

  afterEach(() => {
    queryClient.clear();
    db.close();
  });

  async function openProfileEditor(url = '/profile') {
    const app = await renderApp(url);
    await waitFor(() => expect(screen.getByLabelText('Edit profile').props.accessibilityState?.disabled).toBeFalsy());
    return app;
  }

  async function startEditing() {
    await fireEvent.press(screen.getByLabelText('Edit profile'));
    await screen.findByLabelText('Bio');
  }

  const tab = (name: string) => tabButtons().find((t) => String(t.props.accessibilityLabel).startsWith(`${name},`))!;

  it('renders the real ProfileScreen at /profile with the saved bio', async () => {
    const app = await openProfileEditor();
    expect(app.getPathname()).toBe('/profile');
    expect(await screen.findByText('Saved bio')).toBeTruthy();
    expect(screen.getByLabelText('Edit profile')).toBeTruthy();
  });

  it('a dirty draft + a tab press shows the Discard dialog and does not navigate', async () => {
    const app = await openProfileEditor();
    await startEditing();
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Saved bio, edited');
    await fireEvent.press(tab('Home'));
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(app.getPathname()).toBe('/profile');
  });

  it('Keep editing stays on Profile with the draft', async () => {
    const app = await openProfileEditor();
    await startEditing();
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Saved bio, edited');
    await fireEvent.press(tab('Dashboard'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByText('Discard changes?')).toBeNull());
    expect(app.getPathname()).toBe('/profile');
    expect(screen.getByLabelText('Bio').props.value).toBe('Saved bio, edited');
  });

  it('Discard navigates to the pressed tab', async () => {
    const app = await openProfileEditor();
    await startEditing();
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Saved bio, edited');
    await fireEvent.press(tab('Dashboard'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
  });

  it('an unchanged edit lets the user switch tabs without a dialog', async () => {
    const app = await openProfileEditor();
    await startEditing();
    await fireEvent.press(tab('Home'));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('a dirty draft + a drawer item shows the Discard dialog; Discard then navigates', async () => {
    const app = await openProfileEditor();
    await startEditing();
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Saved bio, edited');
    await fireEvent.press(screen.getByLabelText('Open menu'));
    await fireEvent.press(await screen.findByLabelText('Settings'));
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(app.getPathname()).toBe('/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(app.getPathname()).toBe('/settings'));
  });

  it('a drawer item navigates directly when nothing was edited', async () => {
    const app = await openProfileEditor();
    await fireEvent.press(screen.getByLabelText('Open menu'));
    await fireEvent.press(await screen.findByLabelText('Diary'));
    await waitFor(() => expect(app.getPathname()).toBe('/diary'));
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});

describe('live font scale wiring', () => {
  afterEach(() => {
    Dimensions.set({ window: { ...Dimensions.get('window'), fontScale: 1 }, screen: { ...Dimensions.get('screen'), fontScale: 1 } });
  });

  it('the tab labels get the re-layout marker (tabBarLabelStyle) after a text-size change', async () => {
    await renderApp('/');
    const label = () => within(tabButtons()[0]).getByText('Home');
    expect(StyleSheet.flatten(label().props.style).fontStyle).toBeUndefined();
    await act(async () => {
      Dimensions.set({
        window: { ...Dimensions.get('window'), fontScale: 1.6 },
        screen: { ...Dimensions.get('screen'), fontScale: 1.6 },
      });
    });
    expect(StyleSheet.flatten(label().props.style).fontStyle).toBe('normal');
  });
});
