'use client';

import React from 'react';
import { UtensilsCrossed, Bell, Receipt } from 'lucide-react';

export type RoomTab = 'order' | 'services' | 'bill';

const TABS: Array<{ id: RoomTab; label: string; Icon: typeof Bell }> = [
  { id: 'order', label: 'Order food', Icon: UtensilsCrossed },
  { id: 'services', label: 'Services', Icon: Bell },
  { id: 'bill', label: 'My bill', Icon: Receipt },
];

/** The three things a guest does from the room, kept under the header as they scroll. */
export function RoomTabs({ tab, onChange, billBadge }: { tab: RoomTab; onChange: (t: RoomTab) => void; billBadge?: string | null }) {
  return (
    <nav role="tablist" aria-label="Your room" className="sticky top-[4.25rem] z-30 flex gap-1 rounded-full border border-[#e6d9b8] bg-white/95 p-1 shadow-[0_10px_30px_-22px_rgba(10,50,34,0.6)] backdrop-blur">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onChange(id)}
            className={`relative flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] transition ${active ? 'bg-neutral-950 font-semibold text-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.7)]' : 'text-neutral-600 hover:text-neutral-950'}`}>
            <Icon className="h-4 w-4" aria-hidden /> <span>{label}</span>
            {id === 'bill' && billBadge && !active && <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">{billBadge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
