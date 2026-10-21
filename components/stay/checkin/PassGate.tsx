'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, KeyRound } from 'lucide-react';
import { inr, shortDate } from '../stay-format';
import { stayButton, StayNotice } from '../StayShell';

type Lookup =
  | { state: 'unpaid'; amount: number | null; booking: Summary }
  | { state: 'ready'; pass_token: string; booking: Summary }
  | { state: 'checked_in' | 'closed'; booking: Summary };
interface Summary { first_name: string; check_in: string; check_out: string; guests: number }

interface Props { venueId: string; venueName: string; onToken: (token: string) => void }

/**
 * Where a guest who reserved but has no link yet lands. They enter the booking code and the last four digits of the
 * phone; until the desk has taken the room payment the page says what to expect and keeps checking, and the moment
 * the desk confirms it carries on by itself.
 */
export function PassGate({ venueId, venueName, onToken }: Props) {
  const [code, setCode] = useState('');
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Lookup | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const lookup = useCallback(async (quiet = false) => {
    if (!quiet) { setBusy(true); setError(null); }
    try {
      const res = await fetch('/api/guest/stay/pass/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venue: venueId, code, phone_last4: digits }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { if (!quiet) setError(data.error || 'We could not check that. Please try again.'); return; }
      setResult(data);
      if (data.state === 'ready') onToken(data.pass_token);
    } catch { if (!quiet) setError('Network error. Check your connection and try again.'); } finally { if (!quiet) setBusy(false); }
  }, [venueId, code, digits, onToken]);

  // While the desk has not confirmed payment, look again every few seconds; stop once there is an answer.
  useEffect(() => {
    if (result?.state !== 'unpaid') return;
    timer.current = setInterval(() => void lookup(true), 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [result?.state, lookup]);

  const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-neutral-500';
  const ready = /^ST-[A-Z0-9]{6}$/i.test(code.trim()) && digits.length === 4;

  if (result?.state === 'unpaid') {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-[#e6d9b8] bg-white p-6 text-center shadow-[0_18px_40px_-28px_rgba(10,50,34,0.45)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700"><Clock className="h-5 w-5" /></span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Welcome, {result.booking.first_name}</h2>
          <p className="mt-1 text-sm text-neutral-500">{shortDate(result.booking.check_in)} → {shortDate(result.booking.check_out)} · {result.booking.guests} guest{result.booking.guests === 1 ? '' : 's'}</p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-700">
            Please pay for your room at the front desk{result.amount ? <> (<strong className="text-neutral-950">{inr(result.amount)}</strong>)</> : null} by UPI, cash or card. The moment the desk confirms, this page opens your check-in.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-neutral-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" /> Waiting for the desk…</p>
        </div>
        <StayNotice>Your reservation is free. Nothing is charged online; you pay {venueName} directly.</StayNotice>
      </div>
    );
  }
  if (result?.state === 'checked_in') return <StayNotice tone="good"><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> You are already checked in. Scan the QR card in your room to order and see your bill.</StayNotice>;
  if (result?.state === 'closed') return <StayNotice tone="warn">This booking is no longer open. Please speak to the front desk.</StayNotice>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) void lookup(); }} className="space-y-4 rounded-[1.75rem] border border-[#e6d9b8] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(10,50,34,0.45)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-950 text-white"><KeyRound className="h-4 w-4" /></span>
        <p className="text-sm leading-relaxed text-neutral-600">Reserved with us? Enter your booking code and the last four digits of your mobile number. You pay at the desk first; then check-in opens here.</p>
      </div>
      <div>
        <span className={label}>Booking code</span>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))} placeholder="ST-XXXXXX" autoComplete="off" className={`${stayButton.input} font-mono tracking-wider`} />
      </div>
      <div>
        <span className={label}>Last 4 digits of your mobile</span>
        <input inputMode="numeric" maxLength={4} value={digits} onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" className={`${stayButton.input} font-mono tracking-[0.5em]`} />
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={!ready || busy} className={`${stayButton.primary} w-full`}>{busy ? 'Checking…' : 'Continue'}</button>
      <p className="text-center text-xs text-neutral-400">No booking? Ask at the front desk and they will set you up.</p>
    </form>
  );
}
