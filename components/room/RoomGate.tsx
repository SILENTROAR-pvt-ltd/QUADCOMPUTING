'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { stayButton } from '@/components/stay/StayShell';

interface Props { roomNumber: string; venueName: string; onVerify: (last4: string) => Promise<string | null> }

/** Before anything can be charged to the room: the last four digits of the phone given at check-in. */
export function RoomGate({ roomNumber, venueName, onVerify }: Props) {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length !== 4) return;
    setBusy(true); setError(null);
    const err = await onVerify(digits);
    setBusy(false);
    if (err) { setError(err); setDigits(''); }
  };

  return (
    <div className="mx-auto max-w-sm py-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-200/30 bg-amber-200/10 text-amber-100"><KeyRound className="h-6 w-6" /></span>
      <h2 className="mt-5 font-serif text-3xl font-light text-white">Room {roomNumber}</h2>
      <p className="mt-2 text-sm text-neutral-400">{venueName}. To order to this room, enter the last four digits of the mobile number given at check-in.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={digits} autoFocus
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label="Last four digits of your mobile number" placeholder="••••"
          className="h-16 w-full rounded-2xl border border-neutral-700 bg-neutral-900 text-center font-mono text-3xl tracking-[0.6em] text-white outline-none focus:border-amber-200/60"
        />
        {error && <p className="text-xs text-amber-200">{error}</p>}
        <button type="submit" disabled={digits.length !== 4 || busy} className={`${stayButton.primary} w-full`}>{busy ? 'Checking…' : 'Open my room'}</button>
      </form>
      <p className="mt-6 text-xs text-neutral-500">Not your room, or a new guest? Ask the front desk; they can check you in and this page will follow.</p>
    </div>
  );
}
