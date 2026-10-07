import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { storage } from '@/services/storage/mmkv';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

// The real route tree (src/app) with real providers, except SQLite (native) and the splash.
jest.mock('expo-sqlite', () => ({
  SQLiteProvider: ({ children }: { children: React.ReactNode }) => children,
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
 * The tab bar renders both icon variants and cross-fades them by opacity, so the icon a sighted
 * user sees is the one whose wrapper has opacity 1.
 */
function shownIconVariant(tab: 'home' | 'dashboard'): 'filled' | 'outline' {
  const opacityOf = (testID: string) => {
    let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId(testID);
    while (node) {
      const style = Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
      if (typeof style.opacity === 'number') return style.opacity as number;
      node = node.parent;
    }
    return 1;
  };
  const filled = opacityOf(`tab-icon-${tab}-filled`);
  const outline = opacityOf(`tab-icon-${tab}-outline`);
  expect(filled + outline).toBe(1);
  return filled === 1 ? 'filled' : 'outline';
}

function visibleTabNames() {
  return tabButtons().map((t) => TAB_BUTTON_LABEL.exec(String(t.props.accessibilityLabel))?.[1]);
}

beforeEach(() => {
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
