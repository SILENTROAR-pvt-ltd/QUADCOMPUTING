'use client';

import React from 'react';
import { BadgeCheck, LogIn, LogOut, UserRound } from 'lucide-react';
import { initialsOf } from '@/lib/guest/greeting';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { STRIP_CARD, StripSkeleton } from '@/components/guest/account/strip/StripCards';

interface Props {
  account: GuestAccountSummary | null;
  loading: boolean;
  signingOut: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const serif = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" };

/** The same account card as the menu, in the stay's words: who is reserving, or an invitation to sign in with a Vibers ID. */
export function StayAccountBar({ account, loading, signingOut, onSignIn, onSignOut }: Props) {
  if (loading) return <StripSkeleton />;
  if (!account) {
    return (
      <div className={STRIP_CARD}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3ecdc] ring-1 ring-[#d9c193]"><UserRound className="h-5 w-5 text-[#8a6d3f]" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-tight text-[#10231a]" style={serif}>Have a Vibers ID?</p>
          <p className="line-clamp-2 text-xs leading-snug text-[#10231a]/55">Sign in to reserve in one tap and keep your stays together.</p>
        </div>
        <button type="button" onClick={onSignIn}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-xs font-semibold text-[#f5f1e8] shadow-[0_8px_18px_-10px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/30 transition-colors active:scale-95">
          <LogIn className="h-3.5 w-3.5" aria-hidden /> Sign in
        </button>
      </div>
    );
  }
  return (
    <div className={STRIP_CARD}>
      <span className="relative shrink-0">
        {account.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL for the guest's own photo
          <img src={account.avatar_url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]" />
        ) : (
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#0A3222] via-[#11452f] to-emerald-700 text-[15px] font-semibold tracking-wide text-amber-100 ring-2 ring-white" style={serif}>
            {initialsOf(account.display_name || account.handle)}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white"><BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified account" /></span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#10231a]">Reserving as {account.display_name}</p>
        <p className="truncate text-xs text-[#10231a]/55">{account.handle}<span className="text-[#10231a]/25"> · </span>Your name and mobile fill in by themselves</p>
      </div>
      <button type="button" onClick={onSignOut} disabled={signingOut} aria-label="Log out"
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#e8dfcc] px-3 text-xs font-medium text-[#10231a]/65 transition-colors hover:bg-[#f3ecdc] hover:text-[#10231a] active:scale-95 disabled:opacity-50">
        <LogOut className="h-3.5 w-3.5" aria-hidden /><span className="hidden sm:inline">{signingOut ? 'Logging out…' : 'Log out'}</span>
      </button>
    </div>
  );
}
