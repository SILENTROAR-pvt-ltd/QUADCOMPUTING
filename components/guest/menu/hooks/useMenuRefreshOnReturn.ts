'use client';

import { useEffect, useRef } from 'react';
import { menuApiUrl } from '@/lib/guest/menu-seed';

// At most one re-read per this long, however often the guest switches apps.
export const MENU_RECHECK_MS = 30_000;

/**
 * A guest who keeps the menu open must not keep seeing a dish the host has since switched off (or miss one switched
 * back on). When the guest comes back to the tab, the menu is read again, at most once every 30 seconds; a failed read
 * keeps the menu they have. An order that still carries a dish switched off is refused by the server either way.
 */
export function useMenuRefreshOnReturn(venueId: string, table: string, onItems: (items: any[]) => void) {
  const lastRead = useRef(Date.now());
  const latest = useRef(onItems);
  latest.current = onItems;

  useEffect(() => {
    if (!venueId || !table) return;
    lastRead.current = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRead.current < MENU_RECHECK_MS) return;
      lastRead.current = Date.now();
      fetch(menuApiUrl(venueId, table), { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => { if (data?.success && Array.isArray(data.items)) latest.current(data.items); })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [venueId, table]);
}
