'use client';

import React from 'react';
import { BedDouble, Pencil, Check, X, Printer } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { ROOM_STATUS_STYLE, departure } from '../room-status-style';

interface OccupiedRoomHeaderProps {
  activeRoom: PhysicalRoom;
  isEditingRoomNumber: boolean;
  editedRoomNumber: string;
  isSavingRoomNumber: boolean;
  onSetEditedRoomNumber: (val: string) => void;
  onSetIsEditingRoomNumber: (val: boolean) => void;
  onSaveRoomNumber: () => void;
  onPrint: () => void;
  onClose: () => void;
}

function stayText(room: PhysicalRoom): string {
  if (!room.check_in_time) return 'Checked in today';
  const hours = Math.round((Date.now() - new Date(room.check_in_time).getTime()) / 3_600_000);
  if (hours < 1) return 'Checked in just now';
  if (hours < 24) return `In house ${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `In house ${days} day${days === 1 ? '' : 's'}`;
}

const iconBtn = 'rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer';

/** Room number (editable), status, stay length and due-out, with print and close. */
export function OccupiedRoomHeader(p: OccupiedRoomHeaderProps) {
  const room = p.activeRoom;
  const s = ROOM_STATUS_STYLE.OCCUPIED;
  const out = departure(room);
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><BedDouble className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {p.isEditingRoomNumber ? (
              <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); p.onSaveRoomNumber(); }}>
                <label htmlFor="occ-room-number" className="font-serif text-lg text-neutral-500">Room</label>
                <input id="occ-room-number" autoFocus value={p.editedRoomNumber} onChange={(e) => p.onSetEditedRoomNumber(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 px-2 py-1 font-mono text-base outline-none focus:border-neutral-900" />
                <button type="submit" disabled={p.isSavingRoomNumber} aria-label="Save room number" className={iconBtn}><Check className="h-4 w-4" /></button>
                <button type="button" aria-label="Cancel" className={iconBtn}
                  onClick={() => { p.onSetEditedRoomNumber(room.room_number || ''); p.onSetIsEditingRoomNumber(false); }}><X className="h-4 w-4" /></button>
              </form>
            ) : (
              <>
                <h2 className="font-serif text-2xl tracking-tight text-neutral-950">Room {room.room_number}</h2>
                <button type="button" aria-label="Edit room number" onClick={() => p.onSetIsEditingRoomNumber(true)} className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
              </>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-neutral-500">
            <span>{room.category?.name || 'Room'}</span><span aria-hidden>·</span><span>{stayText(room)}</span>
            {out && <><span aria-hidden>·</span><span className={out.tone === 'late' ? 'font-semibold text-rose-700' : out.tone === 'due' ? 'text-amber-700' : ''}>{out.text}</span></>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={p.onPrint} className="hidden items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 sm:flex cursor-pointer">
          <Printer className="h-3.5 w-3.5" /> Print folio
        </button>
        <button type="button" onClick={p.onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
