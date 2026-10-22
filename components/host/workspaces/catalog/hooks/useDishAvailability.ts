'use client';

import { useCallback, useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CatalogItem } from '@/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Puts a dish on the guest menu or takes it off. The switch moves on the tap; if the server refuses, it moves back and
 * the reason is shown. Guests who open the menu next get the change at once (the server clears its menu cache).
 */
export function useDishAvailability(venueId: string) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  const mark = (id: string, busy: boolean) => setBusyIds((cur) => {
    const next = new Set(cur);
    if (busy) next.add(id); else next.delete(id);
    return next;
  });

  const toggle = useCallback(async (item: CatalogItem) => {
    const turnOn = item.status === 'sold_out';
    useHostWorkspace.getState().upsertCatalogItem({ ...item, status: turnOn ? 'active' : 'sold_out' } as CatalogItem);
    mark(item.id, true);
    try {
      const query = UUID.test(venueId) ? `?business_id=${encodeURIComponent(venueId)}` : '';
      const res = await fetch(`/api/host/catalog/availability${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, available: turnOn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'The change did not save.');
    } catch (e: any) {
      useHostWorkspace.getState().upsertCatalogItem(item);
      window.alert(`${item.name}: ${e?.message || 'The change did not save.'} Try again.`);
    } finally {
      mark(item.id, false);
    }
  }, [venueId]);

  return { toggle, busyIds };
}
