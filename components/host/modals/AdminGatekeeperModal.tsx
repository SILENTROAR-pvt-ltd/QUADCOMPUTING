'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { PinPad } from './PinPad';

interface AdminGatekeeperModalProps {
  onUnlock: () => void;
  onCancel?: () => void;
}

const MSG_WRONG = 'That is not the master PIN. Try again.';
const MSG_STAFF = 'Only the master PIN opens this section.';
const MSG_LIMIT = 'Too many wrong attempts. Wait 15 minutes and try again.';
const MSG_NETWORK = 'No connection. Try again.';

/**
 * Master PIN check in front of a locked section. The page stays visible behind a light blur.
 * Four digits verify on their own; the keyboard works too (0–9, Backspace, Escape).
 */
export function AdminGatekeeperModal({ onUnlock, onCancel }: AdminGatekeeperModalProps) {
  const unlockRef = useRef(onUnlock);
  unlockRef.current = onUnlock;
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No master PIN set: nothing to ask for, so open straight away.
  useEffect(() => {
    let alive = true;
    fetch('/api/host/security/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        if (data && !data.isAdminPinActive) { unlockRef.current(); return; }
        setChecking(false);
      })
      .catch(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);

  const reject = (msg: string) => { setError(msg); setPin(''); };

  const verify = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/host/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) return reject(MSG_LIMIT);
      if (data.securityEnabled === false || (data.success && data.staff?.isAdmin)) return unlockRef.current();
      reject(res.status === 200 ? MSG_STAFF : MSG_WRONG);
    } catch {
      reject(MSG_NETWORK);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4 && !busy) void verify(pin);
    // Verify only when the fourth digit lands; `busy` and `verify` are not triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const press = (key: string) => {
    if (busy) return;
    if (key === 'C') { setPin(''); setError(null); return; }
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    setPin((p) => (p.length < 4 ? p + key : p));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape' && onCancel) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shell = 'fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/20 p-4 backdrop-blur-[3px]';

  if (checking) {
    return (
      <div className={shell}>
        <Loader2 className="h-6 w-6 animate-spin text-neutral-600" aria-label="Checking access" />
      </div>
    );
  }

  return (
    <div className={shell}>
      <div role="dialog" aria-modal="true" aria-labelledby="gate-title" className="w-full max-w-[340px] rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-900"><Lock className="h-5 w-5" /></span>
          <h2 id="gate-title" className="mt-4 font-serif text-xl font-medium tracking-tight text-neutral-950">Master PIN required</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter the 4-digit master PIN to open this section.</p>
        </div>

        <div className="mt-6">
          <PinPad pin={pin} disabled={busy} error={error} onKey={press} />
        </div>

        {busy && <p className="mt-3 text-center text-xs text-neutral-500">Checking…</p>}

        {onCancel && (
          <button type="button" onClick={onCancel} className="mt-5 w-full text-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
