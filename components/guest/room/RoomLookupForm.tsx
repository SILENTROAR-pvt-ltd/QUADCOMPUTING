'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const KEY = (venue: string) => `quad_room_${venue}`;

/** The room this phone last confirmed at the venue, so a returning guest is not asked twice. */
export function rememberedRoom(venue: string): { code: string; number: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(venue)) || 'null');
    return saved?.code && saved?.number ? saved : null;
  } catch { return null; }
}

/**
 * Finds the guest's room from its number and the last four digits of the phone given at check-in, and confirms this
 * phone as the guest's (the same proof the room page asks for). On success the room is remembered on the device.
 */
export function RoomLookupForm({ cafeId, onFound }: { cafeId: string; onFound: (room: { code: string; number: string }) => void }) {
  const [room, setRoom] = useState('');
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !room.trim() || digits.length !== 4) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/guest/stay/room-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venue: cafeId, room_number: room, phone_last4: digits }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'We could not check that. Please try again.'); return; }
      const found = { code: data.room_code, number: data.room_number };
      try { localStorage.setItem(KEY(cafeId), JSON.stringify(found)); } catch { /* optional */ }
      onFound(found);
    } catch { setError('Network error. Check your connection and try again.'); } finally { setBusy(false); }
  };

  const field = 'h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-950 outline-none focus:border-zinc-900';
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <input aria-label="Room number" value={room} onChange={(e) => setRoom(e.target.value.slice(0, 20))} placeholder="Room number" autoComplete="off" className={field} />
      <input aria-label="Last four digits of your mobile number" inputMode="numeric" maxLength={4} value={digits} onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Last 4 digits of your mobile" className={`${field} font-mono tracking-[0.3em]`} />
      {error && <p role="alert" className="text-[12.5px] font-medium text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || !room.trim() || digits.length !== 4}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'One moment…' : 'Open my room'}
      </button>
    </form>
  );
}
