'use client';

import React, { useState } from 'react';
import { BadgeCheck, LogIn, LogOut, UserRound } from 'lucide-react';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import { initialsOf } from '@/lib/guest/greeting';
import { GuestAuthSheet } from './GuestAuthSheet';

interface GuestAccountStripProps {
  venueId: string;
  tableNumber: string;
}

const card = 'flex min-h-[64px] items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-24px_rgba(10,50,34,0.45)]';

/**
 * Account bar under the menu header: who is signed in at this venue (their photo, or their initials on an emerald
 * coin), with Log out; or, for a guest, a clear Sign in. Its space is held while it loads, so nothing below jumps.
 * Nothing identifying is ever put in the page URL.
 */
export function GuestAccountStrip({ venueId, tableNumber }: GuestAccountStripProps) {
  const { account, loading, refresh } = useGuestAccount(venueId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!venueId) return null;

  const logout = async () => {
    setSigningOut(true);
    await signOutGuest();
    // Reload so cart, tracker and wallet state reset to a clean table.
    window.location.reload();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {loading ? (
          <div aria-hidden className={`${card} animate-pulse`}>
            <span className="h-11 w-11 shrink-0 rounded-full bg-zinc-100" />
            <span className="flex-1 space-y-1.5"><span className="block h-3 w-32 rounded bg-zinc-100" /><span className="block h-2.5 w-44 rounded bg-zinc-100" /></span>
          </div>
        ) : account ? (
          <div className={card}>
            <span className="relative shrink-0">
              {account.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL for the guest's own photo
                <img src={account.avatar_url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]" />
              ) : (
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#0A3222] via-[#11452f] to-emerald-700 text-[15px] font-semibold tracking-wide text-amber-100 ring-2 ring-white shadow-[0_4px_12px_-4px_rgba(10,50,34,0.6)]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {initialsOf(account.display_name || account.handle)}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white">
                <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified account" />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-950">{account.display_name}</p>
              <p className="truncate text-xs text-zinc-500">
                <span>{account.handle}</span>
                <span className="text-zinc-300"> · </span>
                <span className="font-medium text-emerald-700">Earning cashback here</span>
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={signingOut}
              aria-label="Log out"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{signingOut ? 'Logging out…' : 'Log out'}</span>
            </button>
          </div>
        ) : (
          <div className={card}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-50 ring-1 ring-amber-200/70">
              <UserRound className="h-5 w-5 text-amber-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-950">Dining as a guest</p>
              <p className="truncate text-xs text-zinc-500">Sign in to earn cashback and keep your orders</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#0A3222] px-3.5 text-xs font-semibold text-white shadow-[0_6px_16px_-8px_rgba(10,50,34,0.8)] transition-colors hover:bg-[#0d3f2b] cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Sign in
            </button>
          </div>
        )}
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
