'use client';

import React from 'react';

interface Props {
  cardLast4: string;
  setCardLast4: (val: string) => void;
  cardAuthRef: string;
  setCardAuthRef: (val: string) => void;
}

export function TenderCardView({
  cardLast4,
  setCardLast4,
  cardAuthRef,
  setCardAuthRef
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Card Last 4 Digits
          </label>
          <input
            type="text"
            maxLength={4}
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value)}
            placeholder="e.g. 4242"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-sm font-medium text-zinc-900 focus:bg-white focus:border-black focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            POS Terminal Ref / Auth Code
          </label>
          <input
            type="text"
            value={cardAuthRef}
            onChange={(e) => setCardAuthRef(e.target.value)}
            placeholder="e.g. TXN-9842"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-sm font-medium text-zinc-900 focus:bg-white focus:border-black focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
}
