'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pinProblem } from '@/lib/services/security/pin-rules';
import type { PinState } from './useProfile';

interface Props {
  kind: 'admin' | 'staff';
  mode: 'set' | 'remove';
  pins: PinState;
  onClose: () => void;
  onDone: (pins: PinState, message: string) => void;
}

const pinInput = 'h-12 w-full rounded-xl border border-neutral-200 text-center font-mono text-2xl tracking-[0.6em] outline-none focus:border-neutral-900';
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

/** Set, change or remove the master or staff PIN. Changes need the current master PIN once one exists. */
export function PinDialog({ kind, mode, pins, onClose, onDone }: Props) {
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsCurrent = pins.isAdminPinSet;
  const name = kind === 'admin' ? 'master PIN' : 'staff POS PIN';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // React forwards submit events up the tree: stop here so the profile form does not also save.
    e.stopPropagation();
    if (mode === 'set') {
      const problem = pinProblem(pin);
      if (problem) { setError(problem); return; }
      if (pin !== confirm) { setError('The two PINs do not match.'); return; }
    }
    setBusy(true); setError(null);
    const res = await fetch('/api/host/security/pin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, pin: mode === 'remove' ? null : pin, currentPin: current }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(json.error || 'No connection. Nothing changed.'); setCurrent(''); return; }
    // Setting the master PIN proves it, so this session stays unlocked.
    if (kind === 'admin' && mode === 'set') sessionStorage.setItem('master_admin_unlocked', 'true');
    window.dispatchEvent(new Event('master_admin_refresh'));
    onDone({ isAdminPinSet: json.isAdminPinSet, isStaffPinSet: json.isStaffPinSet }, mode === 'remove' ? `The ${name} is removed.` : `The ${name} is saved.`);
  };

  // Rendered at the body so it is never nested inside the profile form.
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={name} onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-serif text-2xl text-neutral-950">{mode === 'remove' ? `Remove ${name}` : (kind === 'admin' ? pins.isAdminPinSet : pins.isStaffPinSet) ? `Change ${name}` : `Set ${name}`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          {needsCurrent && (
            <label className="block"><span className="mb-1 block text-xs font-semibold text-neutral-700">Current master PIN</span>
              <input type="password" inputMode="numeric" autoComplete="off" autoFocus value={current} onChange={(e) => setCurrent(digits(e.target.value))} className={pinInput} /></label>
          )}
          {mode === 'set' && (
            <>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-neutral-700">New {kind === 'admin' ? 'master' : 'staff'} PIN</span>
                <input type="password" inputMode="numeric" autoComplete="new-password" autoFocus={!needsCurrent} value={pin} onChange={(e) => setPin(digits(e.target.value))} className={pinInput} /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-neutral-700">Type it again</span>
                <input type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className={pinInput} /></label>
            </>
          )}
          {mode === 'remove' && <p className="text-sm text-neutral-600">{kind === 'admin' ? 'Every section opens without a PIN until you set a new one.' : 'The POS will no longer ask staff for a PIN.'}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        </div>
        <button type="submit" disabled={busy || (needsCurrent && current.length !== 4) || (mode === 'set' && (pin.length !== 4 || confirm.length !== 4))}
          className={`mt-5 h-11 w-full rounded-xl text-sm font-semibold text-white disabled:opacity-40 cursor-pointer ${mode === 'remove' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-neutral-950 hover:bg-neutral-800'}`}>
          {busy ? 'Saving…' : mode === 'remove' ? 'Remove PIN' : 'Save PIN'}
        </button>
      </form>
    </div>,
    document.body,
  );
}
