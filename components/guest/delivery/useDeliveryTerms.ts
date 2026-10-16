'use client';

import { useEffect, useState } from 'react';
import type { DeliveryTerms } from './delivery-client';

/** The venue's delivery terms for the guest's cart. Null while loading or when the venue cannot be reached. */
export function useDeliveryTerms(cafeId: string) {
  const [terms, setTerms] = useState<DeliveryTerms | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cafeId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/guest/delivery-info?cafe_id=${encodeURIComponent(cafeId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled && json?.success) setTerms(json as DeliveryTerms); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cafeId]);

  return { terms, loading };
}
