'use client';

import React, { useEffect } from 'react';
import type { PhysicalRoom } from '@/types';
import { CleaningMaintenanceView } from './checkin/CleaningMaintenanceView';
import { useRoomCheckInState } from './checkin/useRoomCheckInState';
import { RoomDetailsHeader } from './checkin/RoomDetailsHeader';
import { RoomCheckInForm } from './checkin/RoomCheckInForm';

interface Props {
  room: PhysicalRoom | null;
  onClose: () => void;
  onRoomUpdated: () => void;
}

/** A free room: check a guest in, or move it between vacant, housekeeping and maintenance. */
export function RoomDetailsPanel({ room, onClose, onRoomUpdated }: Props) {
  const s = useRoomCheckInState(room, onClose, onRoomUpdated);

  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room, onClose]);

  if (!room) return null;
  const statusBtn = 'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Room ${room.room_number}`}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl animate-in zoom-in-95 duration-200">
        <RoomDetailsHeader
          room={room}
          roomNumber={s.roomNumber}
          setRoomNumber={s.setRoomNumber}
          isEditingRoomNumber={s.isEditingRoomNumber}
          setIsEditingRoomNumber={s.setIsEditingRoomNumber}
          isSavingRoomNumber={s.isSavingRoomNumber}
          handleSaveRoomNumberStandalone={s.handleSaveRoomNumberStandalone}
          roomPrice={s.roomPrice}
          onClose={onClose}
        />

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          {s.error && (
            <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
              <span>{s.error}</span>
              <button type="button" onClick={s.clearError} className="text-xs font-semibold underline underline-offset-2 cursor-pointer">Dismiss</button>
            </div>
          )}

          {room.status === 'VACANT' && (
            <>
              <RoomCheckInForm room={room} checkInState={s} />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Not checking in?</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => s.handleSetStatus('CLEANING')} disabled={s.isUpdating} className={statusBtn}>Send to housekeeping</button>
                  <button type="button" onClick={() => s.handleSetStatus('MAINTENANCE')} disabled={s.isUpdating} className={statusBtn}>Hold for maintenance</button>
                </div>
              </div>
            </>
          )}

          {(room.status === 'CLEANING' || room.status === 'MAINTENANCE') && (
            <CleaningMaintenanceView status={room.status} isUpdating={s.isUpdating} onSetStatus={(status) => s.handleSetStatus(status)} />
          )}
        </div>
      </div>
    </div>
  );
}
