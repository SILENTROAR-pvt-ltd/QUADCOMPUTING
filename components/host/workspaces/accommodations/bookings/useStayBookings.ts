'use client';

import { useCallback, useEffect, useState } from 'react';

export interface StayBooking {
  id: string; category_id: string; room_id: string | null; check_in: string; check_out: string; guests: number;
  guest_name: string; guest_phone: string; guest_email: string | null; note: string | null; status: string;
  confirmation_code: string | null; source: string; created_at: string; category?: { id: string; name: string; price: number } | null;
  /** 'standard', 'late' (after hours) or 'early:<option id>', as the guest stated when reserving. */
  expected_arrival?: string | null;
  /** The room payment taken at the desk for this booking, once it has been. */
  pass?: { id: string; status: 'issued' | 'used'; amount: number; payment_method: string; paid_at: string } | null;
}

export type BookingScope = 'upcoming' | 'all';
export type BookingAction = 'confirm' | 'decline' | 'cancel' | 'no_show';

/** The venue's advance bookings and the desk's actions on them. */
export function useStayBookings(onShowToast: (msg: string) => void, refreshKey = 0) {
  const [scope, setScope] = useState<BookingScope>('upcoming');
  const [bookings, setBookings] = useState<StayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/host/accommodations/bookings?scope=${scope}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'Bookings could not be loaded.'); return; }
      setBookings(data.bookings || []); setError(null);
    } catch { setError('Bookings could not be loaded.'); } finally { setLoading(false); }
  }, [scope]);
  // Reloads when the scope changes, and when a check-in elsewhere on the page has just closed a booking.
  useEffect(() => { void load(); }, [load, refreshKey]);

  const act = async (id: string, action: BookingAction) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/host/accommodations/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { onShowToast(data.error || 'That change could not be saved.'); return; }
      setBookings((b) => b.map((x) => (x.id === id ? data.booking : x)));
      onShowToast(`Booking ${action === 'no_show' ? 'marked no-show' : `${action}ed`.replace('cancelled', 'cancelled').replace('confirmed', 'confirmed')}.`);
    } finally { setBusyId(null); }
  };

  /** A paid stay is cancelled by voiding its pass (owner, master PIN) and then the booking; the refund itself is handed back by the desk. */
  const refundAndCancel = async (b: StayBooking) => {
    if (!b.pass) return act(b.id, 'cancel');
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/host/accommodations/passes/${b.pass.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { onShowToast(data.error || 'Only the owner, with the master PIN unlocked, can cancel a paid stay.'); return; }
    } finally { setBusyId(null); }
    await act(b.id, 'cancel');
    onShowToast(`Cancelled. Return ₹${b.pass.amount.toLocaleString('en-IN')} to ${b.guest_name}.`);
    void load();
  };

  return { scope, setScope, bookings, loading, error, busyId, act, refundAndCancel, reload: load };
}
