'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';

/**
 * Whether the owner lets waiters settle bills from Live Tables. Until it is known (and whenever it cannot be read) it is
 * off, so a waiter is only ever offered "Send to billing" rather than a settle the server would refuse.
 */
export function useWaiterCanSettle(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    void apiRequest<{ enabled: boolean }>('/api/host/settings/waiter-settle', { cache: 'no-store' }).then((r) => {
      if (live) setEnabled(r.ok && r.data?.enabled === true);
    });
    return () => { live = false; };
  }, []);
  return enabled;
}
