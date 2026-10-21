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
    <div className="mx-auto max-w-sm rounded-[2rem] border border-[#e6d9b8] bg-white p-6 text-center shadow-[0_24px_60px_-36px_rgba(10,50,34,0.5)] sm:p-8">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-neutral-950 text-white"><KeyRound className="h-6 w-6" aria-hidden /></span>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">{venueName}</p>
      <h2 className="mt-1.5 text-3xl font-medium text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Room {roomNumber}</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">To open your room page, enter the last four digits of the mobile number given at check-in.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={digits} autoFocus
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label="Last four digits of your mobile number" placeholder="••••"
          className="h-16 w-full rounded-2xl border border-neutral-300 bg-[#faf9f6] text-center font-mono text-3xl tracking-[0.6em] text-neutral-950 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5"
        />
        {error && <p role="alert" className="text-xs text-amber-800">{error}</p>}
        <button type="submit" disabled={digits.length !== 4 || busy} className={`${stayButton.primary} w-full`}>{busy ? 'Checking…' : 'Open my room'}</button>
      </form>
      <p className="mt-6 text-xs leading-relaxed text-neutral-500">Not your room, or a new guest? Ask the front desk; they can check you in and this page will follow.</p>
    </div>
  );
}
