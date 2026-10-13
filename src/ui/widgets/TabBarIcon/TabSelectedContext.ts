import { createContext } from 'react';

/**
 * Whether the enclosing tab bar button is the selected tab. Provided by `HapticTabButton` from the
 * button's `aria-selected`; `undefined` outside a tab button.
 */
export const TabSelectedContext = createContext<boolean | undefined>(undefined);
