'use client';

import React, { useState } from 'react';
import { BedDouble, Droplets, Bell, Shirt, Send } from 'lucide-react';
import { stayButton } from '@/components/stay/StayShell';

interface Props { onRequest: (kind: string, message?: string) => Promise<string> }

const REQUESTS = [
  { kind: 'housekeeping', label: 'Housekeeping', hint: 'Make up the room', Icon: BedDouble },
  { kind: 'water', label: 'Drinking water', hint: 'Extra bottles', Icon: Droplets },
  { kind: 'towels', label: 'Towels', hint: 'Fresh towels', Icon: Shirt },
  { kind: 'front_desk', label: 'Front desk', hint: 'Please call the room', Icon: Bell },
];

/** One-tap requests that ring on the host console, plus a free line for anything else. */
export function RoomServices({ onRequest }: Props) {
  const [sent, setSent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const send = async (kind: string, message?: string) => {
    setBusy(kind);
    const result = await onRequest(kind, message);
    setSent((s) => ({ ...s, [kind]: result }));
    setBusy(null);
    setTimeout(() => setSent((s) => { const c = { ...s }; delete c[kind]; return c; }), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {REQUESTS.map(({ kind, label, hint, Icon }) => (
          <button key={kind} type="button" disabled={busy !== null} onClick={() => void send(kind)}
            className="rounded-[1.5rem] border border-neutral-800 bg-neutral-900/60 p-4 text-left transition hover:border-neutral-600 disabled:opacity-60">
            <Icon className="h-5 w-5 text-amber-100" />
            <span className="mt-3 block font-serif text-lg text-white">{label}</span>
            <span className="block text-xs text-neutral-500">{sent[kind] || hint}</span>
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { void send('custom', custom.trim()); setCustom(''); } }} className="flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 140))} placeholder="Anything else? (an iron, late checkout…)" className={stayButton.input} />
        <button type="submit" disabled={!custom.trim() || busy !== null} aria-label="Send request" className={`${stayButton.primary} w-12 shrink-0 px-0`}><Send className="h-4 w-4" /></button>
      </form>
      {sent.custom && <p className="text-xs text-emerald-200">{sent.custom}</p>}
      <p className="text-xs text-neutral-500">Requests reach the desk and housekeeping at once. For anything urgent, use the room phone.</p>
    </div>
  );
}
