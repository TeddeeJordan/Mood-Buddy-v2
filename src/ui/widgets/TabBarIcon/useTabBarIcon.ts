import { use } from 'react';

import { TabSelectedContext } from './TabSelectedContext';

/**
 * The JS tab bar renders `tabBarIcon` twice per tab, an active layer (`focused: true`) and an
 * inactive one (`focused: false`), stacked and switched by opacity only. A layer is visible when
 * its `focused` matches the tab's real selected state, so only that layer renders an icon; the
 * hidden layer renders nothing and stays out of the accessibility tree. Outside a tab button
 * (no context) the icon always renders.
 */
export function useTabBarIcon(focused: boolean): { visible: boolean } {
  const selected = use(TabSelectedContext);
  return { visible: selected === undefined || selected === focused };
}
