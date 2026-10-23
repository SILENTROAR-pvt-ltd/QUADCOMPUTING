'use client';

import React from 'react';
import { BadgeCheck, LogIn, LogOut, UserRound } from 'lucide-react';
import { initialsOf } from '@/lib/guest/greeting';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';

export const STRIP_CARD = 'flex min-h-[64px] items-center gap-3 rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] px-3 py-2.5 shadow-[0_14px_30px_-26px_rgba(16,35,26,0.55)]';

/** Loading: the card's own shape, shimmering, so the page below never jumps. */
export function StripSkeleton() {
  return (
    <div aria-hidden className={STRIP_CARD}>
      <span className="shimmer h-11 w-11 shrink-0 rounded-full" />
      <span className="flex-1 space-y-1.5"><span className="shimmer block h-3 w-32 rounded" /><span className="shimmer block h-2.5 w-44 rounded" /></span>
    </div>
  );
}

/** Signed in: their photo (or initials on an emerald coin), name, handle, and Log out. */
export function SignedInCard({ account, signingOut, onLogout }: { account: GuestAccountSummary; signingOut: boolean; onLogout: () => void }) {
  return (
    <div className={STRIP_CARD}>
      <span className="relative shrink-0">
        {account.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL for the guest's own photo
          <img src={account.avatar_url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)] ring-2 ring-white" />
        ) : (
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#0A3222] via-[#11452f] to-emerald-700 text-[15px] font-semibold tracking-wide text-amber-100 shadow-[0_4px_12px_-4px_rgba(10,50,34,0.6)] ring-2 ring-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {initialsOf(account.display_name || account.handle)}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white"><BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified account" /></span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#10231a]">{account.display_name}</p>
        <p className="truncate text-xs text-[#10231a]/55">{account.handle}<span className="text-[#10231a]/25"> · </span><span className="font-medium text-[#8a6d3f]">Earning cashback here</span></p>
      </div>
      <button type="button" onClick={onLogout} disabled={signingOut} aria-label="Log out"
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#e8dfcc] px-3 text-xs font-medium text-[#10231a]/65 transition-colors hover:bg-[#f3ecdc] hover:text-[#10231a] active:scale-95 disabled:opacity-50">
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{signingOut ? 'Logging out…' : 'Log out'}</span>
      </button>
    </div>
  );
}

/** Not signed in: a guest, with a clear Sign in. */
export function GuestCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className={STRIP_CARD}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3ecdc] ring-1 ring-[#d9c193] max-[380px]:h-10 max-[380px]:w-10"><UserRound className="h-5 w-5 text-[#8a6d3f]" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold leading-tight text-[#10231a]" style={{ fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" }}>Dining as a guest</p>
        <p className="line-clamp-2 text-xs leading-snug text-[#10231a]/55">Sign in to earn 7% cashback and keep your orders</p>
      </div>
      <button type="button" onClick={onSignIn}
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-xs font-semibold text-[#f5f1e8] shadow-[0_8px_18px_-10px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/30 transition-colors active:scale-95 max-[380px]:px-3">
        <LogIn className="h-3.5 w-3.5 max-[380px]:hidden" aria-hidden /> Sign in
      </button>
    </div>
  );
}
