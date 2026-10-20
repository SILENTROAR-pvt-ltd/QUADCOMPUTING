'use client';

import { useCallback, useEffect, useState } from 'react';

export interface RoomState {
  room: { id: string; room_number: string; status: string; guest_first_name: string | null; check_in_time: string | null; check_out_time: string | null; total_guests: number; category: { name: string; price: number; amenities: string[]; photos: string[] } | null };
  business: { id: string; name: string; slug: string | null; in_room_dining_enabled: boolean; checkout_time: string | null };
  occupied: boolean;
  verified: boolean;
  dining: { enabled: boolean; open: boolean; message: string; opens_at: string | null; closes_at: string | null };
  folio: null | {
    nights: number; tariff_total: number; addons_total: number; dining_total: number; total: number;
    lines: Array<{ id: string; name: string; price: number; qty: number; notes?: string; type: string }>;
    orders: Array<{ id: string; created_at: string; status: string; grand_total: number; items: Array<{ name: string; qty: number; price: number }> }>;
  };
}

/** The in-room page's state, re-read after every action; the guest proves the room is theirs once per stay. */
export function useRoomStay(code: string) {
  const [data, setData] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/guest/room/${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.error || 'This room link is not valid.'); return; }
      setData(json); setError(null);
    } catch { setError('Could not reach the venue. Check your connection.'); } finally { setLoading(false); }
  }, [code]);
  useEffect(() => { void load(); }, [load]);

  // The bill and kitchen hours move while the guest watches; a light refresh keeps them current.
  useEffect(() => {
    if (!data?.verified) return;
    const t = setInterval(() => void load(true), 45_000);
    return () => clearInterval(t);
  }, [data?.verified, load]);

  const verify = async (last4: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/guest/room/${encodeURIComponent(code)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_last4: last4 }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) return json.error || 'Those digits do not match.';
      await load(true);
      return null;
    } catch { return 'Network error. Try again.'; }
  };

  const request = async (kind: string, message?: string): Promise<string> => {
    try {
      const res = await fetch(`/api/guest/room/${encodeURIComponent(code)}/service`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, message }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) return json.error || 'Could not reach the desk.';
      return json.duplicate ? 'Already on its way.' : 'The desk has been told.';
    } catch { return 'Network error. Try again.'; }
  };

  return { data, loading, error, reload: load, verify, request };
}
