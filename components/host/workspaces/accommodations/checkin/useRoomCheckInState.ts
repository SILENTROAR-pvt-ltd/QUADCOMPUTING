'use client';

import { useState } from 'react';
import type { PhysicalRoom } from '@/types';
import { localInputToIso } from './check-in-dates';
import { useCheckInForm } from './useCheckInForm';
import { useCheckInQuote } from './useCheckInQuote';
import type { StayBooking } from '../bookings/useStayBookings';

async function patchRoom(roomId: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`/api/host/accommodations/rooms/${roomId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || 'The room could not be updated. Please try again.';
  } catch {
    return 'No connection. Check the network and try again.';
  }
}

/** The desk's choice, made before check-in: take money now (this much; null is the whole stay) or at checkout. */
export interface CheckInPayment { payNow: boolean; amount: number | null }

/**
 * The vacant-room panel: check-in form, live quote, the payment choice, room renaming and housekeeping status.
 * `onCheckedIn`, when given, takes over from closing after a check-in, so the desk goes straight on to taking the money.
 */
export function useRoomCheckInState(room: PhysicalRoom | null, onClose: () => void, onRoomUpdated: () => void, booking: StayBooking | null = null, onCheckedIn?: (roomId: string, payment: CheckInPayment) => void) {
  const form = useCheckInForm(room, booking);
  const quote = useCheckInQuote({ room, ...form, customAddons: form.customAddons });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingRoomNumber, setIsSavingRoomNumber] = useState(false);
  // A guest arriving with a paid booking owes nothing now; a walk-in usually pays the room on arrival.
  const [payNow, setPayNow] = useState(!booking?.pass);
  const [advance, setAdvance] = useState('');
  // An error belongs to the room it happened on; opening another room starts clean.
  const [error, setError] = useState<{ roomId: string; text: string } | null>(null);

  const run = async (body: Record<string, unknown>, after: () => void) => {
    if (!room) return;
    setIsUpdating(true); setError(null);
    const err = await patchRoom(room.id, body);
    setIsUpdating(false);
    if (err) { setError({ roomId: room.id, text: err }); return; }
    onRoomUpdated(); after();
  };

  const handleSaveRoomNumberStandalone = async () => {
    if (!form.roomNumber.trim()) return;
    setIsSavingRoomNumber(true);
    await run({ room_number: form.roomNumber.trim() }, () => form.setIsEditingRoomNumber(false));
    setIsSavingRoomNumber(false);
  };

  const stayTotal = quote.roomTariffTotal + quote.checkInAddonsTotal;
  const payment = (): CheckInPayment => {
    const typed = Number(advance);
    const amount = advance.trim() !== '' && Number.isFinite(typed) && typed > 0 ? Math.min(stayTotal, typed) : null;
    return { payNow: payNow && (amount === null ? stayTotal > 0 : amount > 0), amount };
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required fields and date order are checked by the server; its message shows in the panel.
    const checkIn = localInputToIso(form.checkInTime);
    const checkOut = localInputToIso(form.checkOutTime);
    await run({
      action: 'check-in',
      booking_id: booking?.id,
      room_number: form.roomNumber.trim(),
      guest_name: form.guestName.trim(),
      guest_phone: form.guestPhone.trim(),
      id_type: form.idProofType,
      id_number: form.idProofNumber.trim(),
      guest_email: form.guestEmail.trim() || null,
      guest_address: form.guestAddress.trim() || null,
      check_in_time: checkIn || new Date().toISOString(),
      check_out_time: checkOut,
      total_guests: (parseInt(form.adultsCount, 10) || 1) + (parseInt(form.childrenCount, 10) || 0),
      purpose_of_visit: form.purposeOfVisit,
      is_celebration: form.isCelebration,
      celebration_type: form.isCelebration ? form.celebrationType : null,
      celebration_note: form.isCelebration ? form.celebrationNote.trim() : null,
      selected_addons: quote.selectedAddonsList,
    }, () => (onCheckedIn && room ? onCheckedIn(room.id, payment()) : onClose()));
  };

  /** The footer's button: submits the form above it (the form element lives in the scrolling body). */
  const submitCheckIn = (formId: string) => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();

  const handleSetStatus = (status: 'VACANT' | 'CLEANING' | 'MAINTENANCE') =>
    run({ action: status === 'VACANT' ? 'mark-clean' : undefined, status }, onClose);

  return {
    ...form, ...quote, nights: String(quote.numNights), isUpdating, isSavingRoomNumber, stayTotal,
    payNow, setPayNow, advance, setAdvance, payment,
    error: error && error.roomId === room?.id ? error.text : null, clearError: () => setError(null),
    handleSaveRoomNumberStandalone, handleCheckIn, submitCheckIn, handleSetStatus,
  };
}
