'use client';

import React from 'react';
import type { PhysicalRoom } from '@/types';
import { ChevronRight, Pencil, Users, Utensils, Sparkles, Wrench, BedDouble } from 'lucide-react';
import { ROOM_STATUS_STYLE, checkedInLabel, departure, inr } from './room-status-style';

interface Props {
  room: PhysicalRoom;
  onSelect: (room: PhysicalRoom) => void;
  onEdit: (room: PhysicalRoom) => void;
}

const TONE = { due: 'text-amber-700', late: 'text-rose-700 font-semibold', normal: 'text-neutral-500' } as const;

/** One room on the front desk: number, status, and what the desk needs to know about it now. */
export function RoomCard({ room, onSelect, onEdit }: Props) {
  const s = ROOM_STATUS_STYLE[room.status] || ROOM_STATUS_STYLE.MAINTENANCE;
  const out = departure(room);
  const kots = room.activeOrdersCount || 0;
  const addons = Array.isArray(room.selected_addons) ? room.selected_addons.length : 0;
  const open = () => onSelect(room);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Room ${room.room_number}, ${s.label}`}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      className={`group flex min-h-[176px] flex-col rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-neutral-900 cursor-pointer ${s.ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-lg font-bold tracking-tight text-neutral-950" title={room.room_number}>{room.room_number}</p>
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">{room.category?.name || 'Standard'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
          </span>
          <button
            type="button"
            aria-label={`Edit room ${room.room_number}`}
            onClick={(e) => { e.stopPropagation(); onEdit(room); }}
            onKeyDown={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-neutral-400 transition-opacity hover:bg-neutral-100 hover:text-neutral-900 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1.5 text-xs">
        {room.status === 'OCCUPIED' && (
          <>
            <p className="truncate text-sm font-semibold text-neutral-950">{room.guest_name || 'In-house guest'}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500">
              {checkedInLabel(room) && <span>{checkedInLabel(room)}</span>}
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{room.total_guests || 1}</span>
              {addons > 0 && <span>{addons} add-on{addons === 1 ? '' : 's'}</span>}
            </p>
            {out && <p className={`text-[11px] ${TONE[out.tone]}`}>{out.text}</p>}
            {kots > 0 && (
              <p className="flex items-center justify-between rounded-lg bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700">
                <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{kots} room-service order{kots === 1 ? '' : 's'}</span>
                <span className="font-mono font-semibold text-neutral-950">{inr(room.activeOrdersTotal || 0)}</span>
              </p>
            )}
          </>
        )}
        {room.status === 'VACANT' && (
          <p className="flex items-center justify-between text-neutral-600">
            <span className="inline-flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-emerald-600" />Ready for a guest</span>
            {Number(room.category?.price) > 0 && <span className="font-mono font-semibold text-neutral-900">{inr(Number(room.category?.price))}</span>}
          </p>
        )}
        {room.status === 'CLEANING' && (
          <p className="inline-flex items-center gap-1.5 text-amber-800"><Sparkles className="h-3.5 w-3.5" />Needs housekeeping before the next guest</p>
        )}
        {room.status === 'MAINTENANCE' && (
          <p className="inline-flex items-center gap-1.5 text-neutral-600"><Wrench className="h-3.5 w-3.5" />Blocked for maintenance</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-[11px] font-semibold text-neutral-500 transition-colors group-hover:text-neutral-950">
        <span>{s.action}</span>
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}
