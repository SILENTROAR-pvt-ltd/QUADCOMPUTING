'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { PlanLockedCard } from '@/components/host/plan/PlanLockedCard';

/** onPlan: the venue's plan has Vibey (Rhodium, or the add-on on M¹-Pro / M²-Pro). */
type Switches = { guest: boolean; host: boolean; pilot: boolean; available: boolean; onPlan?: boolean };
type Which = 'guest' | 'host';

const ROWS: { key: Which; title: string; hint: string; on: string; off: string }[] = [
  { key: 'guest', title: 'Vibey for guests', hint: 'A chat on your menu that helps guests choose dishes and fills their tray.',
    on: 'Guests now see Vibey on your menu.', off: 'Vibey is hidden from your menu.' },
  { key: 'host', title: 'Vibey for you', hint: 'Your co-pilot in this app: ask about sales, tables and stock.',
    on: 'Your Vibey co-pilot is on.', off: 'Your Vibey co-pilot is off.' },
];

/**
 * The owner's Vibey switches: the guest chat on the menu and the co-pilot in this app. Each saves the moment it is
 * flipped and goes back if the save fails.
 */
export function VibeySection() {
  const [state, setState] = useState<Switches | null>(null);
  const [busy, setBusy] = useState<Which | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Off the plan, a switch can still be turned off but not on.
  const locked = state?.onPlan === false;

  useEffect(() => {
    let live = true;
    void apiRequest<Switches>('/api/host/settings/vibey', { cache: 'no-store' }).then((r) => {
      if (live) setState(r.ok && r.data ? r.data : { guest: false, host: false, pilot: false, available: true });
    });
    return () => { live = false; };
  }, []);

  const flip = async (row: (typeof ROWS)[number]) => {
    if (!state || busy) return;
    const next = !state[row.key];
    setState({ ...state, [row.key]: next });
    setBusy(row.key);
    setMessage(null);
    const r = await apiRequest<Switches>('/api/host/settings/vibey', jsonRequest('PUT', { [row.key]: next }));
    setBusy(null);
    if (r.ok) return setMessage({ ok: true, text: next ? row.on : row.off });
    setState((s) => (s ? { ...s, [row.key]: !next } : s));
    setMessage({ ok: false, text: r.error || 'The setting could not be saved. Please try again.' });
  };

  return (
    <section id="vibey" aria-label="Vibey" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f2a1e] text-[#d9c193]"><Sparkles className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-neutral-950">Vibey</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">Your venue&apos;s assistant. Switch it on for guests, for yourself, or both.</p>
        </div>
      </div>
      {locked && <div className="mt-4"><PlanLockedCard feature="vibey" /></div>}
      <ul className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
        {ROWS.map((row) => {
          const on = state?.[row.key] === true;
          return (
            <li key={row.key} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">{row.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{row.hint}</p>
              </div>
              <button type="button" role="switch" aria-checked={on} aria-label={row.title} onClick={() => void flip(row)} disabled={!state || busy !== null || (locked && !on)}
                className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-700' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </li>
          );
        })}
      </ul>
      {state?.pilot && !locked && <p className="mt-3 text-xs text-amber-700">This venue is in the Vibey pilot, so Vibey stays on for testing whatever these switches say.</p>}
      {state && !state.available && <p className="mt-3 text-xs text-amber-700">Vibey is paused across the platform right now; your choice is saved for when it returns.</p>}
      {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-3 text-xs font-medium ${message.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{message.text}</p>}
    </section>
  );
}
