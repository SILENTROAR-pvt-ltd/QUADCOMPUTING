'use client';

import React, { useEffect } from 'react';
import type { PhysicalRoom } from '@/types';
import { CleaningMaintenanceView } from './checkin/CleaningMaintenanceView';
import { useRoomCheckInState } from './checkin/useRoomCheckInState';
import { RoomDetailsHeader } from './checkin/RoomDetailsHeader';
import { RoomCheckInForm, CHECK_IN_FORM_ID } from './checkin/RoomCheckInForm';
import { CheckInFooter } from './checkin/CheckInFooter';
import { BookingPicker } from './checkin/BookingPicker';
import type { StayBooking } from './bookings/useStayBookings';

interface Props {
  room: PhysicalRoom | null;
  onClose: () => void;
  onRoomUpdated: () => void;
  /** The reservation this guest arrives with, if any; it fills the form and is closed by the check-in. */
  booking?: StayBooking | null;
  onBookingChange?: (b: StayBooking | null) => void;
}

/**
 * A free room: check a guest in (with or without a reservation), or move it between vacant, housekeeping and
 * maintenance. Fills the screen on a phone, a card on a desk; the total and the check-in button stay in view.
 */
export function RoomDetailsPanel({ room, onClose, onRoomUpdated, booking = null, onBookingChange }: Props) {
  const s = useRoomCheckInState(room, onClose, onRoomUpdated, booking);

  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [room, onClose]);

  if (!room) return null;
  const statusBtn = 'h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Room ${room.room_number}`}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-neutral-50 text-neutral-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-neutral-200">
        <RoomDetailsHeader room={room} roomNumber={s.roomNumber} setRoomNumber={s.setRoomNumber} isEditingRoomNumber={s.isEditingRoomNumber} setIsEditingRoomNumber={s.setIsEditingRoomNumber}
          isSavingRoomNumber={s.isSavingRoomNumber} handleSaveRoomNumberStandalone={s.handleSaveRoomNumberStandalone} roomPrice={s.roomPrice} onClose={onClose} />

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {s.error && (
            <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
              <span>{s.error}</span>
              <button type="button" onClick={s.clearError} className="cursor-pointer text-xs font-semibold underline underline-offset-2">Dismiss</button>
            </div>
          )}
          {room.status === 'VACANT' && (
            <>
              {onBookingChange && <BookingPicker room={room} booking={booking} onPick={onBookingChange} />}
              <RoomCheckInForm checkInState={s} />
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Not checking in?</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => s.handleSetStatus('CLEANING')} disabled={s.isUpdating} className={statusBtn}>Housekeeping</button>
                  <button type="button" onClick={() => s.handleSetStatus('MAINTENANCE')} disabled={s.isUpdating} className={statusBtn}>Hold for maintenance</button>
                </div>
              </div>
            </>
          )}
          {(room.status === 'CLEANING' || room.status === 'MAINTENANCE') && (
            <CleaningMaintenanceView status={room.status} isUpdating={s.isUpdating} onSetStatus={(status) => s.handleSetStatus(status)} />
          )}
        </div>

        {room.status === 'VACANT' && (
          <CheckInFooter formId={CHECK_IN_FORM_ID} numNights={s.numNights} roomPrice={s.roomPrice} roomTariffTotal={s.roomTariffTotal}
            checkInAddonsTotal={s.checkInAddonsTotal} estimatedTotal={s.estimatedTotalWithAddons} isUpdating={s.isUpdating} />
        )}
      </div>
    </div>
  );
}
