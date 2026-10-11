'use client';

import React, { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button, Card, Notice } from '../ui';
import { clubFetch } from '../api';

/** The creator reads and signs the responsibility agreement; signing submits the plan for review. */
export function ConsentSubmit({ eventId, consent, onDone }: { eventId: string; consent: { version: number; body: string }; onDone: () => void }) {
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const res = await clubFetch(`/events/${eventId}/action`, { body: { action: 'submit', agree: true, consent_version: consent.version } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone();
  };

  return (
    <Card className="space-y-3">
      <p className="flex items-center gap-2 font-semibold"><ScrollText aria-hidden="true" className="h-4 w-4 text-[#be185d]" /> Responsibility & consent · v{consent.version}</p>
      <p className="rounded-2xl bg-[#f3ebff]/60 p-4 text-sm leading-relaxed text-[#2a1250]/80">{consent.body}</p>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#7c3aed]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree. Sign it with my Viber ID, and record the time and my IP address.</span>
      </label>
      <Notice>{error}</Notice>
      <Button tone="aura" busy={busy} disabled={!agree} onClick={submit}>Sign and submit for review</Button>
    </Card>
  );
}
