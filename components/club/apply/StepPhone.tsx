'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import type { ApplyForm } from './apply-form';

/** Mobile number with a 6-digit SMS code. A verified number stays good for 30 minutes. */
export function StepPhone({ form, set }: { form: ApplyForm; set: (patch: Partial<ApplyForm>) => void }) {
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError('');
    setBusy(true);
    const res = await clubFetch('/otp/send', { body: { phone: form.phone } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSentTo(res.data.phone);
  };

  const verify = async () => {
    setError('');
    setBusy(true);
    const res = await clubFetch('/otp/verify', { body: { phone: form.phone, code } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    set({ phone_verified: true });
  };

  if (form.phone_verified) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-[#e1efe3] px-4 py-3 text-sm text-[#2f5d1f]">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {form.phone} is verified.
        <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => { set({ phone_verified: false }); setSentTo(''); setCode(''); }}>Change</button>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Label text="Mobile number" hint="10 digits for India, or +country code">
        <div className="flex gap-2">
          <input className={field} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => { set({ phone: e.target.value }); setSentTo(''); }} placeholder="98765 43210" />
          <Button type="button" tone="quiet" busy={busy && !sentTo} onClick={send} className="shrink-0">{sentTo ? 'Resend' : 'Send code'}</Button>
        </div>
      </Label>
      {sentTo && (
        <Label text={`Code sent to ${sentTo}`}>
          <div className="flex gap-2">
            <input className={`${field} tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
            <Button type="button" busy={busy} onClick={verify} disabled={code.length !== 6} className="shrink-0">Verify</Button>
          </div>
        </Label>
      )}
      {process.env.NODE_ENV !== 'production' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#3c6b2b]/25 bg-[#e1efe3] p-3 text-xs text-[#14261b]/80">
          <div>
            <span className="font-bold text-[#3c6b2b]">⚡ Localhost Dev:</span> Master OTP is <code className="rounded bg-[#e1efe3] px-1 py-0.5 font-mono font-bold text-[#2f5d1f]">123456</code>
          </div>
          <Button
            type="button"
            tone="quiet"
            className="shrink-0 bg-[#e1efe3] px-3 py-1 text-xs hover:bg-[#e1efe3]"
            busy={busy}
            onClick={async () => {
              setError('');
              setBusy(true);
              const p = form.phone || '9876543210';
              if (!form.phone) set({ phone: p });
              const res = await clubFetch('/otp/verify', { body: { phone: p, code: '123456' } });
              setBusy(false);
              if (!res.ok) return setError(res.error);
              set({ phone_verified: true });
            }}
          >
            Auto-Verify (Dev)
          </Button>
        </div>
      )}
      <Notice>{error}</Notice>
    </div>
  );
}
