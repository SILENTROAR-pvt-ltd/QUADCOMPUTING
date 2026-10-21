'use client';

import React from 'react';
import { BedDouble, Check, Pencil, X } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { ROOM_STATUS_STYLE } from '../room-status-style';

interface Props {
  room: PhysicalRoom;
  roomNumber: string;
  setRoomNumber: (val: string) => void;
  isEditingRoomNumber: boolean;
  setIsEditingRoomNumber: (val: boolean) => void;
  isSavingRoomNumber: boolean;
  handleSaveRoomNumberStandalone: () => void;
  roomPrice: number;
  onClose: () => void;
}

const iconBtn = 'grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900';

/** The room this panel is about: its number (renamable here), status, type and rate. */
export function RoomDetailsHeader(p: Props) {
  const s = ROOM_STATUS_STYLE[p.room.status];
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3.5 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] sm:px-6 sm:pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700"><BedDouble className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {p.isEditingRoomNumber ? (
              <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); p.handleSaveRoomNumberStandalone(); }}>
                <label htmlFor="vacant-room-number" className="font-serif text-lg text-neutral-500">Room</label>
                <input id="vacant-room-number" autoFocus value={p.roomNumber} onChange={(e) => p.setRoomNumber(e.target.value)} className="h-9 w-24 rounded-lg border border-neutral-300 px-2 font-mono text-base outline-none focus:border-neutral-900" />
                <button type="submit" disabled={p.isSavingRoomNumber} aria-label="Save room number" className={iconBtn}><Check className="h-4 w-4" /></button>
                <button type="button" aria-label="Cancel" onClick={() => { p.setRoomNumber(p.room.room_number || ''); p.setIsEditingRoomNumber(false); }} className={iconBtn}><X className="h-4 w-4" /></button>
              </form>
            ) : (
              <>
                <h2 className="font-serif text-xl tracking-tight text-neutral-950 sm:text-2xl">Room {p.room.room_number}</h2>
                <button type="button" aria-label="Rename room" onClick={() => p.setIsEditingRoomNumber(true)} className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
              </>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}</span>
          </div>
          <p className="truncate text-xs text-neutral-500">{p.room.category?.name || 'Room'} · ₹{p.roomPrice.toLocaleString('en-IN')} / night</p>
        </div>
      </div>
      <button type="button" onClick={p.onClose} aria-label="Close" className={`${iconBtn} h-9 w-9 shrink-0`}><X className="h-5 w-5" /></button>
    </div>
  );
}
