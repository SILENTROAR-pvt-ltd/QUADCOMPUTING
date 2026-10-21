'use client';

import { useEffect, useState } from 'react';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import type { StayType } from './stay-format';

/**
 * Reserve goes through the same Vibers ID sign-in as the menu. A signed-in guest opens the booking sheet at once; anyone
 * else sees the sign-in sheet first, and may continue without an account, exactly as at the table. Coming back from
 * Google (?auth=google|failed, see /auth/callback) reopens the sheet so the profile can be finished.
 */
export function useStayAuthGate(venueId: string) {
  const { account, loading, refresh } = useGuestAccount(venueId);
  const [booking, setBooking] = useState<StayType | null>(null);
  const [pending, setPending] = useState<StayType | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const marker = url.searchParams.get('auth');
    if (marker !== 'google' && marker !== 'failed') return;
    url.searchParams.delete('auth');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    if (marker === 'failed') setNotice('Google sign-in did not complete. Please try again, or use your email.');
    setAuthOpen(true);
  }, []);

  const close = () => { setAuthOpen(false); setPending(null); setNotice(''); };

  return {
    account, loading, signingOut, authOpen, notice, booking,
    closeBooking: () => setBooking(null),
    /** Reserve this room type: straight to the sheet when signed in, otherwise through sign-in first. */
    reserve: (type: StayType) => { if (account) setBooking(type); else { setPending(type); setAuthOpen(true); } },
    openSignIn: () => setAuthOpen(true),
    closeAuth: close,
    onSignedIn: () => { const next = pending; close(); void refresh(); if (next) setBooking(next); },
    /** Offered only on the way to a reservation; the sheet then asks for the name and number itself. */
    onBrowse: pending ? () => { const next = pending; close(); setBooking(next); } : undefined,
    logout: async () => { setSigningOut(true); try { await signOutGuest(); } finally { setSigningOut(false); } },
  };
}
