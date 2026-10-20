'use client';

import React, { useState } from 'react';
import { ChevronUp, X } from 'lucide-react';
import { inr } from '@/components/stay/stay-format';
import { stayButton } from '@/components/stay/StayShell';
import type { Dish } from './useRoomMenu';

interface Props {
  roomNumber: string; lines: Array<{ dish: Dish; qty: number }>; total: number; count: number;
  note: string; setNote: (v: string) => void; placing: boolean; canOrder: boolean;
  onAdd: (id: string, delta?: number) => void; onPlace: () => Promise<boolean>; onClear: () => void;
}

/** The tray, docked at the bottom; one tap charges it to the room. Nothing is paid now. */
export function RoomTray(p: Props) {
  const [open, setOpen] = useState(false);
  if (p.count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-5xl px-4 pb-4 sm:px-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-neutral-700 bg-neutral-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {open && (
          <div className="max-h-[45dvh] overflow-y-auto border-b border-neutral-800 p-4">
            <ul className="space-y-2">
              {p.lines.map((l) => (
                <li key={l.dish.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-white">{l.dish.name}</span>
                  <span className="inline-flex items-center gap-2">
                    <button type="button" onClick={() => p.onAdd(l.dish.id, -1)} className="h-7 w-7 rounded-full border border-neutral-700 text-white">−</button>
                    <span className="w-4 text-center font-mono text-white">{l.qty}</span>
                    <button type="button" onClick={() => p.onAdd(l.dish.id, 1)} className="h-7 w-7 rounded-full border border-neutral-700 text-white">+</button>
                  </span>
                  <span className="w-16 text-right font-mono text-neutral-300">{inr(l.dish.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <textarea value={p.note} onChange={(e) => p.setNote(e.target.value.slice(0, 120))} rows={2} placeholder="A note for the kitchen (less spicy, no onion…)" className={`${stayButton.input} mt-3 h-auto py-2 text-xs`} />
            <button type="button" onClick={p.onClear} className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-white"><X className="h-3 w-3" /> Clear tray</button>
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200/15 font-mono text-sm text-amber-100">{p.count}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm text-white">{inr(p.total)} · charge to room {p.roomNumber}</span>
              <span className="block text-[11px] text-neutral-500">Added to your bill, settled at checkout</span>
            </span>
            <ChevronUp className={`h-4 w-4 shrink-0 text-neutral-500 transition ${open ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" disabled={!p.canOrder || p.placing} onClick={() => void p.onPlace()} className={`${stayButton.primary} h-11 px-4 text-xs`}>
            {p.placing ? 'Sending…' : 'Order to room'}
          </button>
        </div>
      </div>
    </div>
  );
}
