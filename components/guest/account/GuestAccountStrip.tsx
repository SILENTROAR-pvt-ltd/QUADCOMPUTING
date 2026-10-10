'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import { GuestAuthSheet } from './GuestAuthSheet';

interface GuestAccountStripProps {
  venueId: string;
  tableNumber: string;
}

/**
 * Account bar under the menu header: who is signed in at this venue, with
 * Sign in / Log out. Nothing identifying is ever put in the page URL.
 */
export function GuestAccountStrip({ venueId, tableNumber }: GuestAccountStripProps) {
  const { account, loading, refresh } = useGuestAccount(venueId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (loading || !venueId) return null;

  const logout = async () => {
    setSigningOut(true);
    await signOutGuest();
    // Reload so cart, tracker and wallet state reset to a clean table.
    window.location.reload();
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {account ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e8e2d5] bg-[#faf8f5] text-base">{account.avatar}</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-neutral-500 leading-tight">Signed in</p>
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {account.display_name} <span className="text-neutral-400 font-normal">· {account.handle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={signingOut}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                {signingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">Guest</p>
                  <p className="text-[11px] text-neutral-500 truncate">Sign in to keep your cashback and history</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      <GuestAuthSheet
        isOpen={sheetOpen}
        venueId={venueId}
        tableNumber={tableNumber}
        onClose={() => setSheetOpen(false)}
        onSignedIn={() => { setSheetOpen(false); void refresh(); }}
      />
    </>
  );
}

export default GuestAccountStrip;
