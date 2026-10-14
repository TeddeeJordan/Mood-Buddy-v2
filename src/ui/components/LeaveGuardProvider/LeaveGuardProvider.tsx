import { useState } from 'react';

import { createLeaveGuardRegistry, LeaveGuardContext } from '@/hooks/useLeaveGuard';

import type { LeaveGuardProviderProps } from './LeaveGuardProvider.props';

/**
 * Wraps the Drawer so the drawer items, the Tabs `tabPress` listener and the screens share one
 * leave-guard registry (`src/hooks/useLeaveGuard.ts`). The value never changes, so it never
 * re-renders consumers.
 */
export function LeaveGuardProvider({ children }: LeaveGuardProviderProps) {
  const [registry] = useState(createLeaveGuardRegistry);
  return <LeaveGuardContext value={registry}>{children}</LeaveGuardContext>;
}
