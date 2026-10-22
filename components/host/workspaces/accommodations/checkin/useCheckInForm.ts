'use client';

import { useState, useEffect } from 'react';
import type { PhysicalRoom, RoomAddon } from '@/types';
import { checkoutAfterNights, nowLocalInput } from './check-in-dates';
import { bookingPrefill } from './booking-prefill';
import type { StayBooking } from '../bookings/useStayBookings';

/** The check-in form's fields, reset whenever a different room is opened; a reservation, when given, fills in the guest. */
export function useCheckInForm(room: PhysicalRoom | null, booking: StayBooking | null = null) {
  const [roomNumber, setRoomNumber] = useState(room?.room_number || '');
  const [isEditingRoomNumber, setIsEditingRoomNumber] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  // The desk confirms it saw the ID and the guest consents to it being kept; asked afresh for every check-in.
  const [consent, setConsent] = useState(false);
  const [checkInTime, setCheckInTime] = useState(nowLocalInput());
  const [checkOutTime, setCheckOutTime] = useState(() => checkoutAfterNights(nowLocalInput(), 1));
  const [adultsCount, setAdultsCount] = useState('2');
  const [childrenCount, setChildrenCount] = useState('0');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Leisure & Tourism');
  const [isCelebration, setIsCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('Birthday');
  const [celebrationNote, setCelebrationNote] = useState('');
  const [chosenAddonIds, setChosenAddonIds] = useState<string[]>([]);
  const [customAddons, setCustomAddons] = useState<RoomAddon[]>([]);

  useEffect(() => {
    if (!room?.id) return;
    const now = nowLocalInput();
    setRoomNumber(room.room_number || ''); setIsEditingRoomNumber(false);
    setGuestName(''); setGuestPhone(''); setGuestEmail(''); setGuestAddress('');
    setIdProofType('Aadhaar Card'); setIdProofNumber(''); setConsent(false);
    setCheckInTime(now); setCheckOutTime(checkoutAfterNights(now, 1));
    setAdultsCount(String(room.category?.occupancy || 2)); setChildrenCount('0');
    setPurposeOfVisit('Leisure & Tourism'); setIsCelebration(false); setCelebrationType('Birthday'); setCelebrationNote('');
    setChosenAddonIds([]); setCustomAddons([]);
    if (booking) {
      const p = bookingPrefill(booking, now);
      setGuestName(p.guestName); setGuestPhone(p.guestPhone); setGuestEmail(p.guestEmail);
      setAdultsCount(p.adults); setCheckOutTime(p.checkOutTime);
    }
    // Only a different room or booking resets the form; live refreshes of the same room keep what was typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, booking?.id]);

  // Typing a number of nights moves the expected checkout, so the dates (which checkout bills by) agree.
  const setNights = (val: string) => {
    const n = Math.min(90, Math.max(1, parseInt(val, 10) || 1));
    setCheckOutTime(checkoutAfterNights(checkInTime, n));
  };

  return {
    roomNumber, setRoomNumber, isEditingRoomNumber, setIsEditingRoomNumber,
    guestName, setGuestName, guestPhone, setGuestPhone, guestEmail, setGuestEmail, guestAddress, setGuestAddress,
    idProofType, setIdProofType, idProofNumber, setIdProofNumber, consent, setConsent,
    checkInTime, handleCheckInDateChange: setCheckInTime, checkOutTime, handleCheckOutDateChange: setCheckOutTime, setNights,
    adultsCount, setAdultsCount, childrenCount, setChildrenCount,
    purposeOfVisit, setPurposeOfVisit, isCelebration, setIsCelebration, celebrationType, setCelebrationType,
    celebrationNote, setCelebrationNote, chosenAddonIds, customAddons,
    toggleChosenAddon: (id: string) => setChosenAddonIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    handleAddCustomAddon: (a: RoomAddon) => { setCustomAddons((p) => [...p, a]); setChosenAddonIds((p) => [...p, a.id]); },
  };
}
