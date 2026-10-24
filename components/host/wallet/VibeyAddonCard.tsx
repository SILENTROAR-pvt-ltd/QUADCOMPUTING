'use client';

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { VIBEY_ADDON } from '@/lib/services/wallet/plans';

interface Props {
  /** The plan in force is M¹-Pro or M²-Pro (trial or paid): the add-on can be bought. */
  eligible: boolean;
  /** Vibey already comes with the plan (Pay as you go, Rhodium Pro). */
  included: boolean;
  /** End of a running add-on. */
  until: string | null;
  isLocked?: boolean;
  onBuy: () => void;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const price = `₹${VIBEY_ADDON.price.toLocaleString('en-IN')}`;

/** Vibey sold on its own, a year at a time, for M¹-Pro and M²-Pro; Pay as you go and Rhodium Pro already include it. */
export function VibeyAddonCard({ eligible, included, until, isLocked, onBuy }: Props) {
  return (
    <section aria-label="Add-on" className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Add-on</h4>
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-900 text-amber-200"><Sparkles className="h-5 w-5" /></div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-neutral-900">{VIBEY_ADDON.name}</p>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">{price}<span className="text-xs font-normal text-neutral-500"> / year</span></span>
                {until && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">On until {date(until)}</span>}
              </div>
              <p className="text-xs leading-relaxed text-neutral-600">
                The AI waiter that answers guests in their own language and suggests from your menu, plus your co-pilot in the
                dashboard. For QC² M¹-Pro and M²-Pro; You earn, we earn and Rhodium Pro include it.
              </p>
            </div>
          </div>
          {included ? (
            <span className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Included in your plan
            </span>
          ) : eligible ? (
            <button type="button" disabled={isLocked} onClick={onBuy}
              className="h-10 shrink-0 rounded-xl bg-neutral-900 px-5 text-xs font-semibold text-white hover:bg-black disabled:opacity-40">
              {until ? `Extend a year · ${price}` : `Buy Vibey · ${price}/yr`}
            </button>
          ) : (
            <p className="shrink-0 text-xs text-neutral-500 sm:max-w-[12rem] sm:text-right">Choose M¹-Pro or M²-Pro to add Vibey.</p>
          )}
        </div>
      </div>
    </section>
  );
}
