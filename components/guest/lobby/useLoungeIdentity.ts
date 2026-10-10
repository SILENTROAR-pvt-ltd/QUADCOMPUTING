'use client';

import React, { useState } from 'react';
import { useGuestLobbyStore } from '@/lib/store/guest-lobby.store';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestAddressHandle, useGuestDocumentTitle } from '@/lib/guest/use-guest-title';

const BROWSE_KEY = 'vc_lounge_browse';

/** Who is in the lounge: the server-verified account, a read-only visitor, or someone still to join. */
export function useLoungeIdentity(cafeId: string, tableParam: string) {
  const { session, setSession } = useGuestLobbyStore();
  // Identity comes from the server-verified account, never from browser storage alone.
  const { account, loading: accountLoading } = useGuestAccount(cafeId);
  const [guestHandle, setGuestHandle] = useState('');
  // A guest who chose "Just look around" browses read-only until they join.
  const [browsing, setBrowsing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useGuestDocumentTitle('Lounge', account?.handle ?? null);
  useGuestAddressHandle(account?.handle ?? null, !accountLoading);

  React.useEffect(() => {
    if (accountLoading) return;
    if (account) {
      setGuestHandle(account.handle);
      setBrowsing(false);
      setShowOnboarding(false);
      return;
    }
    setGuestHandle('');
    let skipped = false;
    try { skipped = sessionStorage.getItem(BROWSE_KEY) === '1'; } catch {}
    setBrowsing(skipped);
    setShowOnboarding(!skipped);
  }, [account, accountLoading]);

  const handleBrowseOnly = () => {
    try { sessionStorage.setItem(BROWSE_KEY, '1'); } catch {}
    setBrowsing(true);
    setShowOnboarding(false);
  };

  const handleOnboardingComplete = (name: string, handle: string) => {
    setGuestHandle(handle);
    setSession({
      session_id: session?.session_id || `GS-${Date.now()}`,
      guest_name: name,
      table_number: session?.table_number || tableParam,
      business_id: cafeId,
      avatar: '☕',
      status: 'active' as const,
    });
    try { sessionStorage.removeItem(BROWSE_KEY); } catch {}
    setBrowsing(false);
    setShowOnboarding(false);
  };

  return {
    guestHandle,
    browsing,
    showOnboarding,
    openOnboarding: () => setShowOnboarding(true),
    handleBrowseOnly,
    handleOnboardingComplete,
  };
}
