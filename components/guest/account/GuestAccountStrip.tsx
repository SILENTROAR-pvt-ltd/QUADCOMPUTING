'use client';

import React, { useEffect, useState } from 'react';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import { GuestAuthSheet } from './GuestAuthSheet';
import { GuestCard, SignedInCard, StripSkeleton } from './strip/StripCards';

interface GuestAccountStripProps {
  venueId: string;
  tableNumber: string;
}

/**
 * Account bar under the menu header: who is signed in at this venue, with Log out; or, for a guest, a clear Sign in. Its
 * space is held while it loads, so nothing below jumps. Nothing identifying is ever put in the page URL.
 */
export function GuestAccountStrip({ venueId, tableNumber }: GuestAccountStripProps) {
  const { account, loading, refresh } = useGuestAccount(venueId);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState('');

  // Back from Google (see /auth/callback): open the sheet, which finishes the profile or goes straight in. The marker is
  // removed from the address so a refresh does not reopen it; table and venue in the query are left untouched.
  useEffect(() => {
    const url = new URL(window.location.href);
    const marker = url.searchParams.get('auth');
    if (marker !== 'google' && marker !== 'failed') return;
    url.searchParams.delete('auth');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    if (marker === 'failed') setNotice('Google sign-in did not complete. Please try again, or use your email.');
    setOpen(true);
  }, []);

  if (!venueId) return null;

  const logout = async () => {
    setSigningOut(true);
    await signOutGuest();
    // Reload so cart, tracker and wallet state reset to a clean table.
    window.location.reload();
  };
  const close = () => { setOpen(false); setNotice(''); };

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {loading ? <StripSkeleton /> : account ? <SignedInCard account={account} signingOut={signingOut} onLogout={() => void logout()} /> : <GuestCard onSignIn={() => setOpen(true)} />}
      </div>
      <GuestAuthSheet isOpen={open} venueId={venueId} tableNumber={tableNumber} onClose={close} onSignedIn={() => { close(); void refresh(); }} notice={notice} />
    </>
  );
}

export default GuestAccountStrip;
