'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchGuestAccountState,
  GUEST_ACCOUNT_EVENT,
  clearGuestIdentity,
  type GuestAccountSummary,
} from './guest-account-client';

/**
 * Who is signed in at this venue, as the server sees it. Identity is cleared only when the server
 * says signed out. A failed check keeps the current state, so a transient error can't wipe the
 * device's wallet secret.
 */
export function useGuestAccount(venueId: string) {
  const [account, setAccount] = useState<GuestAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const state = await fetchGuestAccountState(venueId);
    if (state.status === 'unknown') {
      setLoading(false);
      return;
    }
    if (state.status === 'out') {
      clearGuestIdentity();
      setAccount(null);
    } else {
      setAccount(state.account);
    }
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    if (!venueId) { setLoading(false); return; }
    void refresh();
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<GuestAccountSummary | null>).detail;
      if (detail === null) setAccount(null);
      else if (detail) setAccount(detail);
    };
    window.addEventListener(GUEST_ACCOUNT_EVENT, onChange);
    return () => window.removeEventListener(GUEST_ACCOUNT_EVENT, onChange);
  }, [venueId, refresh]);

  return { account, loading, refresh };
}
