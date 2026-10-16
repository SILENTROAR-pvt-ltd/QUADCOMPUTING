'use client';

import React, { useState } from 'react';
import { changeGuestPin } from '@/lib/guest/guest-account-client';

function PinField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
      <input
        type="password" inputMode="numeric" autoComplete={autoComplete} maxLength={6} value={value} placeholder="6 digits"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[16px] tracking-[0.4em] text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none sm:text-sm"
      />
    </label>
  );
}

/**
 * Change PIN, for the old @handle + PIN accounts. Its own action, so it never saves the profile fields. Changing it signs
 * the guest out on their other devices.
 */
export function PinSection({ venueId }: { venueId: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const save = async () => {
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: 'The two new PINs do not match.' });
    setBusy(true);
    const outcome = await changeGuestPin(venueId, current, next);
    setBusy(false);
    if (!outcome.ok) return setMsg({ ok: false, text: outcome.error });
    setOpen(false);
    reset();
    setMsg({ ok: true, text: 'PIN changed. Your other devices are signed out.' });
  };

  const tone = msg?.ok ? 'text-emerald-700' : 'text-rose-600';
  return (
    <section aria-label="Security" className="rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Security</p>
          <p className="text-[11px] text-zinc-500">Changing your PIN signs you out on your other devices.</p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">Change PIN</button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-2.5">
          <PinField label="Current PIN" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PinField label="New PIN" value={next} onChange={setNext} autoComplete="new-password" />
          <PinField label="Confirm new PIN" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {msg && <p role="alert" className={`text-xs font-medium ${tone}`}>{msg.text}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setOpen(false); reset(); setMsg(null); }} className="flex-1 cursor-pointer rounded-xl border border-zinc-200 py-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void save()} className="flex-1 cursor-pointer rounded-xl bg-zinc-950 py-3 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save new PIN'}
            </button>
          </div>
        </div>
      )}
      {msg && !open && <p role="status" className={`mt-3 text-xs font-medium ${tone}`}>{msg.text}</p>}
    </section>
  );
}
