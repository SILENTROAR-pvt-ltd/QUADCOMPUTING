'use client';

import React from 'react';
import { BedDouble, ChevronRight, Sparkles, Users } from 'lucide-react';
import type { HistoricalStayRecord } from '@/types';
import { dayShort, guestId, inr, plural } from './stay-format';

interface Props { stay: HistoricalStayRecord; onOpen: (stay: HistoricalStayRecord) => void }

/**
 * One past stay in the ledger: who, which room, when, what it came to. Reads as a card on a phone and as one line on a
 * desk, and opens the full record either way.
 */
export function StayHistoryRow({ stay, onOpen }: Props) {
  const room = stay.room_number || stay.room?.room_number || 'Room';
  const category = stay.category_name || stay.room?.category?.name || 'Room';
  const nights = stay.nights || 1;
  const id = guestId(stay);
  const settled = Boolean(stay.check_out_time);

  return (
    <li>
      <button type="button" onClick={() => onOpen(stay)}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 sm:px-5 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700"><BedDouble className="h-4 w-4" aria-hidden /></span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-neutral-950">{stay.guest_name || 'Guest'}</span>
          <span className="block truncate text-xs text-neutral-500">
            Room <span className="font-mono font-semibold text-neutral-800">{room}</span> · {category}
            {id.type && <span className="hidden sm:inline"> · {id.type}{id.number ? ` ${id.number}` : ''}</span>}
          </span>
        </span>

        <span className="text-right lg:hidden">
          <span className="block font-mono text-sm font-bold text-neutral-950">{inr(stay.total_billed_amount)}</span>
          <span className={`block text-[10px] font-semibold uppercase tracking-wider ${settled ? 'text-emerald-700' : 'text-sky-700'}`}>{settled ? 'Settled' : 'In house'}</span>
        </span>

        <span className="col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 lg:col-span-1 lg:block">
          <span className="font-medium text-neutral-800">{dayShort(stay.check_in_time)} → {stay.check_out_time ? dayShort(stay.check_out_time) : 'in house'}</span>
          <span className="lg:block lg:text-neutral-500">{plural(nights, 'night')} · <Users className="inline h-3 w-3 align-[-1px]" aria-hidden /> {stay.total_guests || 1}</span>
        </span>

        <span className="hidden min-w-0 lg:flex lg:flex-wrap lg:gap-1.5">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700">{stay.purpose_of_visit || 'Leisure'}</span>
          {stay.is_celebration && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><Sparkles className="h-3 w-3" aria-hidden />{stay.celebration_type || 'Celebration'}</span>}
        </span>

        <span className="hidden text-right lg:block">
          <span className="block font-mono text-sm font-bold text-neutral-950">{inr(stay.total_billed_amount)}</span>
          <span className={`block text-[10px] font-semibold uppercase tracking-wider ${settled ? 'text-emerald-700' : 'text-sky-700'}`}>{settled ? 'Settled' : 'In house'}</span>
        </span>

        <ChevronRight className="hidden h-4 w-4 text-neutral-400 lg:block" aria-hidden />
      </button>
    </li>
  );
}
