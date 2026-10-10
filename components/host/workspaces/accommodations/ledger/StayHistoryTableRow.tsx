'use client';

import React from 'react';
import type { HistoricalStayRecord } from '@/types';
import { Bed, Clock, Sparkles, Receipt } from 'lucide-react';
import { StayGuestCell } from './StayGuestCell';

interface Props {
  stay: HistoricalStayRecord;
  onSelectForInvoice: (stay: HistoricalStayRecord) => void;
}

export function StayHistoryTableRow({ stay, onSelectForInvoice }: Props) {
  const roomNum = stay.room_number || stay.room?.room_number || 'Room';
  const catName = stay.category_name || stay.room?.category?.name || 'Standard Accommodation';
  const billedTotal = Number(stay.total_billed_amount) || 0;
  const nights = stay.nights || 1;

  const formatDate = (dateStr?: string | null, fallback = 'N/A') =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : fallback;

  return (
    <tr className="hover:bg-neutral-50/70 transition-colors group">
      <td className="py-3.5 px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 border border-neutral-200/80 text-neutral-700">
            <Bed className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="font-mono text-xs sm:text-sm font-bold text-neutral-900 block truncate">Room {roomNum}</span>
            <span className="text-[11px] text-neutral-500 block truncate mt-0.5">{catName}</span>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 min-w-[190px]">
        <StayGuestCell stay={stay} />
      </td>

      <td className="py-3.5 px-4">
        <div>
          <div className="font-medium text-neutral-800 text-xs">{formatDate(stay.check_in_time)} → {formatDate(stay.check_out_time, 'In-House')}</div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="font-semibold text-neutral-700">{nights} Night{nights > 1 ? 's' : ''}</span>
            <span>• {stay.total_guests || 1} guest{(stay.total_guests || 1) > 1 ? 's' : ''}</span>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-1 items-start">
          <span className="rounded-full bg-neutral-100 border border-neutral-200/70 px-2.5 py-0.5 text-[10px] font-medium text-neutral-700">
            {stay.purpose_of_visit || 'Leisure'}
          </span>
          {stay.is_celebration && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200/70 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-800">
              <Sparkles className="h-3 w-3 text-neutral-500 shrink-0" />
              <span>{stay.celebration_type || 'Special Occasion'}</span>
            </span>
          )}
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div>
          <span className="font-mono text-xs sm:text-sm font-bold text-neutral-900 block">
            ₹{billedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium">Tariff + Addons + F&B</span>
        </div>
      </td>

      <td className="py-3.5 px-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200/60 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Settled
        </span>
      </td>

      <td className="py-3.5 px-6 text-right">
        <button onClick={() => onSelectForInvoice(stay)} type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-900 hover:text-white transition-all cursor-pointer">
          <Receipt className="h-3.5 w-3.5" /><span>View Invoice / Folio</span>
        </button>
      </td>
    </tr>
  );
}
