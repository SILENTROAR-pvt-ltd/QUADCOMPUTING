'use client';

import React, { useEffect, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

/**
 * The owner's switch for waiters: may they settle a bill from Live Tables (choosing cash, UPI or card, and freeing the
 * table), or only send it to billing for the cashier? It starts off, saves the moment it is flipped, and goes back if the
 * save fails.
 */
export function WaiterPermissionsSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    void apiRequest<{ enabled: boolean }>('/api/host/settings/waiter-settle', { cache: 'no-store' }).then((r) => {
      if (live) setEnabled(r.ok ? r.data?.enabled === true : false);
    });
    return () => { live = false; };
  }, []);

  const flip = async () => {
    if (enabled === null || busy) return;
    const next = !enabled;
    setEnabled(next);
    setBusy(true);
    setMessage(null);
    const r = await apiRequest('/api/host/settings/waiter-settle', jsonRequest('PUT', { enabled: next }));
    setBusy(false);
    if (r.ok) return setMessage({ ok: true, text: next ? 'Waiters can now settle bills from Live Tables.' : 'Waiters can only send bills to billing.' });
    setEnabled(!next);
    setMessage({ ok: false, text: r.error || 'The setting could not be saved. Please try again.' });
  };

  return (
    <section id="waiters" aria-label="Waiter permissions" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700"><HandCoins className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-neutral-950">Waiters and payment</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
            Off: a waiter can only send a table&apos;s bill to billing, and the cashier settles it. On: a waiter can also settle it from
            Live Tables, choosing cash, UPI or card, which frees the table.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={enabled === true} aria-label="Let waiters settle bills" onClick={() => void flip()} disabled={enabled === null || busy}
          className={`relative mt-1 h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-emerald-700' : 'bg-neutral-300'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-3 text-xs font-medium ${message.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{message.text}</p>}
    </section>
  );
}
