'use client';

import React, { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { inr } from '@/components/stay/stay-format';
import { StayNotice, StaySpinner } from '@/components/stay/StayShell';
import type { Dish } from './useRoomMenu';

interface Props { dishes: Dish[]; categories: string[]; loading: boolean; tray: Record<string, number>; canOrder: boolean; closedMessage: string; onAdd: (id: string, delta?: number) => void }

/** The dishes, by category, with a quantity stepper on each; frozen with the kitchen's message when it is closed. */
export function RoomMenu({ dishes, categories, loading, tray, canOrder, closedMessage, onAdd }: Props) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const shown = useMemo(() => dishes.filter((d) => (category === 'All' || d.category === category) && (!query || d.name.toLowerCase().includes(query.toLowerCase()))), [dishes, category, query]);

  if (loading) return <StaySpinner label="Loading the menu" />;
  if (dishes.length === 0) return <StayNotice>The kitchen has not published a menu yet. Ring the desk and they will take your order.</StayNotice>;

  return (
    <div className="space-y-4">
      {!canOrder && <StayNotice tone="warn">{closedMessage}. You can browse; ordering opens with the kitchen.</StayNotice>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu" className="h-11 w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-200/60" />
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {['All', ...categories].map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition ${category === c ? 'bg-white font-semibold text-neutral-950' : 'border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>
      <ul className="divide-y divide-neutral-800/80 rounded-[1.5rem] border border-neutral-800 bg-neutral-900/40">
        {shown.map((d) => {
          const qty = tray[d.id] || 0;
          return (
            <li key={d.id} className="flex items-center gap-3 p-4">
              {d.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- dish photos come from the venue's own storage
                <img src={d.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-neutral-800 font-serif text-xl text-neutral-400">{d.name[0]}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg text-white">{d.name}</p>
                {d.description && <p className="line-clamp-1 text-xs text-neutral-500">{d.description}</p>}
                <p className="mt-0.5 font-mono text-sm text-neutral-200">{inr(d.price)}</p>
              </div>
              {qty === 0 ? (
                <button type="button" disabled={!canOrder} onClick={() => onAdd(d.id, 1)} className="h-9 rounded-xl border border-neutral-700 px-3 text-xs font-semibold text-white transition hover:bg-white hover:text-neutral-950 disabled:opacity-40">Add</button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200/40 bg-amber-200/10">
                  <button type="button" aria-label={`One less ${d.name}`} onClick={() => onAdd(d.id, -1)} className="grid h-9 w-9 place-items-center text-white"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-5 text-center font-mono text-sm text-white">{qty}</span>
                  <button type="button" aria-label={`One more ${d.name}`} onClick={() => onAdd(d.id, 1)} className="grid h-9 w-9 place-items-center text-white"><Plus className="h-3.5 w-3.5" /></button>
                </span>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-6 text-center text-sm text-neutral-500">Nothing matches that.</li>}
      </ul>
    </div>
  );
}
