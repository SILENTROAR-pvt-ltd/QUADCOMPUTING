'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';

export interface CatalogItem { id: string; name: string; price: number; category: string; item_type?: string; is_available?: boolean }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The venue's orderable dishes. Room add-ons and unavailable items are left out: a table cannot order them. */
export function useMenuCatalog(venueId: string) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiRequest<{ items: CatalogItem[] }>(`/api/host/catalog?business_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' }).then((r) => {
      if (!alive) return;
      setItems((r.data?.items ?? []).filter((i) => UUID.test(i.id) && i.is_available !== false && i.item_type !== 'room'));
      setError(r.ok ? null : r.error);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [venueId]);

  return { items, loading, error };
}
