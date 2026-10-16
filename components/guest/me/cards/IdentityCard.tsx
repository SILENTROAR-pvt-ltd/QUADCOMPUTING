'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { GUEST_BRAND } from '@/lib/brand';
import { travellerTypeInfo } from '@/lib/guest/traveller-types';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';

interface IdentityCardProps {
  account: GuestAccountSummary | null;
  tableNumber: string;
  venueName: string;
  onEdit: () => void;
}

/** Who the guest is here: picture, name, handle and table, how they travel, their intro, and a nudge to add details. */
export function IdentityCard({ account, tableNumber, venueName, onEdit }: IdentityCardProps) {
  const name = account?.display_name || 'Guest';
  const handle = account?.handle || '';
  const phone = account?.phone_masked || '';
  const travel = travellerTypeInfo(account?.traveller_type);
  const hasProfile = Boolean(handle && phone);

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8e2d5] bg-[#faf8f5] text-2xl">
          {account?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the guest's own saved photo
            <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (account?.avatar || '☕')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-400">{GUEST_BRAND.name}</p>
          <h2 className="truncate font-serif text-2xl leading-tight text-neutral-950">{name}</h2>
          <p className="truncate text-xs text-neutral-500">{handle || 'No wallet handle yet'}{phone ? ` · ${phone}` : ''} · Table {tableNumber}</p>
        </div>
        {account && (
          <button type="button" onClick={onEdit} className="shrink-0 cursor-pointer rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50">Edit</button>
        )}
      </div>
      {travel && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">
            <span aria-hidden="true">{travel.emoji}</span> {travel.label}
          </span>
        </div>
      )}
      {account?.intro && <p className="mt-3 font-serif text-base italic leading-snug text-neutral-700">&ldquo;{account.intro}&rdquo;</p>}
      {account && !travel && !account.intro && <p className="mt-3 text-xs text-neutral-500">Add how you travel and a line about you. Tap Edit.</p>}
      {!hasProfile && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-emerald-900">Earn 7% back on every bill at {venueName}. Add your name and mobile number when you place your next order.</p>
        </div>
      )}
    </section>
  );
}
