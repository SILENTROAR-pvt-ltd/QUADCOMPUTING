'use client';

import React from 'react';
import type { PhysicalRoom } from '@/types';
import { Bed, X, Pencil, Check } from 'lucide-react';
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

export function RoomDetailsHeader({
  room, roomNumber, setRoomNumber, isEditingRoomNumber, setIsEditingRoomNumber,
  isSavingRoomNumber, handleSaveRoomNumberStandalone, roomPrice, onClose,
}: Props) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5 bg-white text-neutral-900 shrink-0">
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200">
          <Bed className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            {isEditingRoomNumber ? (
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 font-serif text-lg">Room</span>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-lg px-2 py-0.5 text-neutral-900 font-mono text-base outline-none w-28 focus:border-neutral-400"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={isSavingRoomNumber}
                  onClick={handleSaveRoomNumberStandalone}
                  className="rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 p-1 transition-colors cursor-pointer border border-neutral-200"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setRoomNumber(room.room_number || ''); setIsEditingRoomNumber(false); }}
                  className="rounded-lg hover:bg-neutral-100 text-neutral-500 p-1 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-2xl tracking-tight text-neutral-950">Room {room.room_number}</h2>
                <button type="button" aria-label="Edit room number" onClick={() => setIsEditingRoomNumber(true)} className="rounded-lg p-1 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ROOM_STATUS_STYLE[room.status].chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ROOM_STATUS_STYLE[room.status].dot}`} />{ROOM_STATUS_STYLE[room.status].label}
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">{room.category?.name || 'Standard Unit'} • ₹{roomPrice.toLocaleString()} / night</p>
        </div>
      </div>
      <button onClick={onClose} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
