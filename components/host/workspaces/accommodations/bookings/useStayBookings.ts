'use client';

import { useCallback, useEffect, useState } from 'react';

export interface StayBooking {
  id: string; category_id: string; room_id: string | null; check_in: string; check_out: string; guests: number;
  guest_name: string; guest_phone: string; guest_email: string | null; note: string | null; status: string;
  confirmation_code: string | null; source: string; created_at: string; category?: { id: string; name: string; price: number } | null;
}

export type BookingScope = 'upcoming' | 'all';
export type BookingAction = 'confirm' | 'decline' | 'cancel' | 'no_show';

/** The venue's advance bookings and the desk's actions on them. */
export function useStayBookings(onShowToast: (msg: string) => void) {
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
  useEffect(() => { void load(); }, [load]);

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

  return { scope, setScope, bookings, loading, error, busyId, act, reload: load };
}
