'use client';

import { useEffect } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { ControlCenterTab } from '../ControlCenterHeader';
import { useVisibleTabs } from './useVisibleTabs';

/**
 * Opens the venue's home section when the current one is not part of it (Kitchen for a homestay,
 * from an old link or after the venue type changed). Waits for the profile so a stay host is not
 * moved off Accommodations before their venue type has loaded.
 */
export function useVenueTabGuard(activeTab: ControlCenterTab, switchTab: (tab: ControlCenterTab) => void) {
  const { allowed, home } = useVisibleTabs();
  const ready = useHostWorkspace((s) => s.hydrated && Boolean(s.profile));
  useEffect(() => {
    if (ready && !allowed.has(activeTab)) switchTab(home);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, allowed, home, activeTab]);
}
